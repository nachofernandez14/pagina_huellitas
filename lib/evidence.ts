import { getClientIp } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';

export interface RequestContext {
  ip: string;
  userAgent: string | null;
}

/**
 * Minimal technical evidence captured per request: trusted-proxy IP and
 * user-agent. This is intentionally narrow — enough to investigate suspicious
 * orders or payment failures later, without fingerprinting or device tracking.
 */
export function getRequestContext(req: Request): RequestContext {
  return {
    ip: getClientIp(req),
    userAgent: req.headers.get('user-agent')?.slice(0, 300) ?? null,
  };
}

/**
 * Append an event to `order_events` (private table, service-role only).
 * Never throws — evidence logging must not break the checkout or the webhook.
 */
export async function recordOrderEvent(
  orderId: string | null | undefined,
  event: string,
  opts: {
    source?: 'client' | 'webhook' | 'admin' | 'system';
    detail?: Record<string, unknown>;
    ctx?: RequestContext | null;
  } = {}
): Promise<void> {
  if (!orderId) return;

  const { source = 'system', detail, ctx } = opts;
  const row = {
    order_id: orderId,
    event,
    source,
    ip: ctx?.ip ?? null,
    user_agent: ctx?.userAgent ?? null,
    detail: detail ? detail : null,
  };

  console.log('[order_event]', JSON.stringify(row));

  try {
    const admin = createAdminClient();
    await admin.from('order_events').insert(row);
  } catch {
    // Table might not exist yet or transient Supabase issue — console log above
    // is the fallback record.
  }
}
