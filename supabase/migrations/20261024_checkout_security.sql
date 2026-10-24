-- ============================================================================
-- Checkout security hardening
-- - orders: payment lifecycle separated from fulfilment state (payment_status)
-- - orders: contact email verified at checkout (contact_verified)
-- - checkout_email_codes: one-time codes to verify guest checkout emails
-- - order_events: private audit trail (source IP, user-agent, payment events)
-- - consume_rate_limit(key, max, window): atomic rate limiting RPC
-- RLS: new tables are private (no policies = deny all for anon/authenticated;
-- the server uses the service-role key which bypasses RLS).
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. orders: payment lifecycle metadata
-- ────────────────────────────────────────────────────────────────────────────

alter table public.orders
  add column if not exists payment_status text not null default 'pending'
    check (payment_status in (
      'pending', 'in_process', 'approved', 'rejected',
      'cancelled', 'refunded', 'charged_back', 'cash_pending'
    )),
  add column if not exists payment_verified_at timestamptz,
  add column if not exists payment_received numeric(12, 2),
  add column if not exists contact_verified boolean not null default false;

-- Backfill from existing data: anything effectively completed was paid.
update public.orders
   set payment_status = 'approved',
       payment_verified_at = updated_at
 where forma_pago is distinct from 'efectivo'
   and estado in ('paid', 'preparing', 'ready', 'shipped', 'delivered');

update public.orders
   set payment_status = 'cash_pending'
 where forma_pago = 'efectivo';

create index if not exists orders_guest_email_idx on public.orders (guest_email);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. checkout_email_codes: one-time verification codes (guest checkout)
--    Codes are only stored hashed. Rows expire and are cleaned up lazily.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.checkout_email_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  last_ip text,
  last_user_agent text
);

create index if not exists checkout_email_codes_email_idx
  on public.checkout_email_codes (email, created_at desc);

alter table public.checkout_email_codes enable row level security;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. order_events: private evidence trail per order
--    Stores client IP / user-agent + payment lifecycle events so suspicious
--    orders can be investigated later. Service-role writes only.
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  event text not null,
  source text,          -- 'client' | 'webhook' | 'admin' | 'system'
  ip text,
  user_agent text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists order_events_order_idx
  on public.order_events (order_id, created_at desc);

alter table public.order_events enable row level security;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Atomic rate limiting.
--    The previous read-then-update implementation had a race under
--    concurrency (parallel requests could exceed the limit). This single
--    upsert is atomic and mirrors app/lib rate-limit.ts.
--    Compatible schema: rate_limits(key text PK/unique, count int,
--    reset_at timestamptz, updated_at timestamptz).
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.consume_rate_limit(
  p_key text,
  p_max int,
  p_window_secs int
)
returns table (allowed boolean, reset_at timestamptz)
language sql
as $$
  insert into rate_limits as rl (key, count, reset_at, updated_at)
  values (
    p_key,
    1,
    now() + make_interval(secs => p_window_secs),
    now()
  )
  on conflict (key) do update
    set count = case when rl.reset_at < now() then 1 else rl.count + 1 end,
        reset_at = case
          when rl.reset_at < now()
          then now() + make_interval(secs => p_window_secs)
          else rl.reset_at
        end,
        updated_at = now()
  returning rl.count <= p_max as allowed, rl.reset_at;
$$;

-- Optional but recommended: purge stale one-time codes.
create or replace function public.purge_expired_checkout_codes()
returns void
language sql
as $$
  delete from checkout_email_codes
   where expires_at < now() - interval '1 day'
      or consumed_at < now() - interval '1 day';
$$;
