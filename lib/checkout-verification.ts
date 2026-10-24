import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Guest checkout email verification.
 *
 * Guests confirm their email with a one-time 6-digit code (sent via Resend)
 * before an order is created. On success the server issues a short-lived
 * signed token that `create-preference` / `cash-order` validate server-side.
 *
 * Security properties:
 * - Codes are stored hashed, never plaintext.
 * - Single use, 15 min expiry, max 5 attempts before the code is invalidated.
 * - Issuing a code invalidates any older unconsumed code for that email.
 * - The signed token is stateless (HMAC over email+timestamp, 30 min TTL) and
 *   bound to the exact email that will receive the order.
 */

const SECRET = process.env.CLAVE_SECRETA;
const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const TOKEN_TTL_MS = 30 * 60 * 1000;

export interface RequestMeta {
  ip?: string | null;
  userAgent?: string | null;
}

export type CodeRequestResult =
  | { ok: true; code: string; expiresAt: string }
  | { ok: false; reason: 'server-error' };

export type CodeConfirmResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'expired' | 'invalid' | 'too-many-attempts' | 'server-error' };

export function isCheckoutVerificationConfigured(): boolean {
  return !!SECRET;
}

function hashCode(email: string, code: string): string {
  return createHash('sha256').update(`${SECRET}:${email}:${code}`).digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/**
 * Create a verification code for the email. Any previous unconsumed code is
 * invalidated. Returns the plaintext code so the caller can email it.
 */
export async function requestCheckoutEmailCode(
  email: string,
  meta: RequestMeta
): Promise<CodeRequestResult> {
  const admin = createAdminClient();
  try {
    // Invalidate older codes for this email.
    await admin
      .from('checkout_email_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('email', email)
      .is('consumed_at', null);

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

    const { error } = await admin.from('checkout_email_codes').insert({
      email,
      code_hash: hashCode(email, code),
      expires_at: expiresAt,
      last_ip: meta.ip ?? null,
      last_user_agent: meta.userAgent ?? null,
    });

    if (error) {
      console.error('[checkout-verification] insert failed', error.message);
      return { ok: false, reason: 'server-error' };
    }
    return { ok: true, code, expiresAt };
  } catch (err) {
    console.error('[checkout-verification] request failed', err);
    return { ok: false, reason: 'server-error' };
  }
}

/**
 * Consume a one-time code. On success issues a signed checkout token bound
 * to the email.
 */
export async function confirmCheckoutEmailCode(
  email: string,
  code: string,
  meta: RequestMeta
): Promise<CodeConfirmResult> {
  const admin = createAdminClient();
  try {
    const { data: entry, error } = await admin
      .from('checkout_email_codes')
      .select('id, code_hash, expires_at, attempts, consumed_at')
      .eq('email', email)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !entry) return { ok: false, reason: 'expired' };
    if (entry.consumed_at || new Date(entry.expires_at).getTime() < Date.now()) {
      // Burn whatever was stored so it cannot linger.
      await admin
        .from('checkout_email_codes')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', entry.id);
      return { ok: false, reason: 'expired' };
    }
    if (entry.attempts >= MAX_ATTEMPTS) {
      await admin
        .from('checkout_email_codes')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', entry.id);
      return { ok: false, reason: 'too-many-attempts' };
    }

    const matches = safeEqualHex(hashCode(email, code), entry.code_hash);

    if (!matches) {
      const attempts = entry.attempts + 1;
      const exhausted = attempts >= MAX_ATTEMPTS;
      await admin
        .from('checkout_email_codes')
        .update({
          attempts,
          // After 5 wrong tries the code is burned.
          ...(exhausted ? { consumed_at: new Date().toISOString() } : {}),
        })
        .eq('id', entry.id);
      return {
        ok: false,
        reason: exhausted ? 'too-many-attempts' : 'invalid',
      };
    }

    const { error: consumeError } = await admin
      .from('checkout_email_codes')
      .update({
        consumed_at: new Date().toISOString(),
        attempts: entry.attempts + 1,
        last_ip: meta.ip ?? null,
        last_user_agent: meta.userAgent ?? null,
      })
      .eq('id', entry.id)
      .is('consumed_at', null);

    if (consumeError) {
      console.error('[checkout-verification] consume update failed', consumeError.message);
      return { ok: false, reason: 'server-error' };
    }

    return { ok: true, token: issueCheckoutToken(email) };
  } catch (err) {
    console.error('[checkout-verification] confirm failed', err);
    return { ok: false, reason: 'server-error' };
  }
}

// ─── Signed checkout token ──────────────────────────────────────────────────

export function issueCheckoutToken(email: string): string {
  const payload = `checkout:${email.toLowerCase()}:${Date.now()}`;
  const hmac = createHmac('sha256', SECRET!).update(payload).digest('hex');
  return `${Buffer.from(payload).toString('base64url')}.${hmac}`;
}

/**
 * Validate a checkout token for the given order email. The token email must
 * match the email the order will be created with.
 */
export function verifyCheckoutToken(token: string, orderEmail: string): boolean {
  if (!token || !SECRET) return false;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return false;

  let payload: string;
  try {
    payload = Buffer.from(token.slice(0, dot), 'base64url').toString();
  } catch {
    return false;
  }

  const expected = createHmac('sha256', SECRET).update(payload).digest('hex');
  const received = token.slice(dot + 1);
  const expectedBuf = Buffer.from(expected, 'hex');
  const receivedBuf = Buffer.from(received, 'hex');
  if (expectedBuf.length !== receivedBuf.length || !timingSafeEqual(expectedBuf, receivedBuf)) {
    return false;
  }

  const parts = payload.split(':');
  if (parts.length !== 3 || parts[0] !== 'checkout') return false;

  const [, email, issuedAt] = parts;
  const age = Date.now() - Number(issuedAt);
  if (age > TOKEN_TTL_MS || age < -60 * 1000) return false;

  return email.toLowerCase() === orderEmail.toLowerCase();
}
