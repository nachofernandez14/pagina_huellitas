import { createAdminClient } from '@/lib/supabase/admin';

let cleanupCounter = 0;

interface ConsumeResult {
  allowed: boolean;
  reset_at: string;
}

/**
 * @param key      Unique key (e.g. `"signup:1.2.3.4"`)
 * @param limit    Max requests allowed in the window
 * @param windowMs Window duration in milliseconds
 * @returns `{ allowed: boolean; remaining: number; resetAt: number }`
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const resetAtFallback = Date.now() + windowMs;

  // Preferred: atomic single-statement increment (see supabase migrations).
  // The old read-then-update flow allowed parallel requests to bypass the limit.
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc('consume_rate_limit', {
      p_key: key,
      p_max: limit,
      p_window_secs: Math.ceil(windowMs / 1000),
    });

    if (!error && data && data.length > 0) {
      const entry = data[0] as ConsumeResult;
      const resetAt = new Date(entry.reset_at).getTime();
      return {
        allowed: entry.allowed,
        remaining: Math.max(0, limit - 1),
        resetAt: Number.isFinite(resetAt) ? resetAt : resetAtFallback,
      };
    }
  } catch {
    // Migration not applied yet — fall through to the legacy two-step flow.
  }

  const supabase = createAdminClient();
  const now = Date.now();
  const nowISO = new Date(now).toISOString();

  const { data: entry } = await supabase
    .from('rate_limits')
    .select('count, reset_at')
    .eq('key', key)
    .maybeSingle();

  if (!entry || new Date(entry.reset_at).getTime() < now) {
    const resetAt = now + windowMs;
    await supabase
      .from('rate_limits')
      .upsert(
        { key, count: 1, reset_at: new Date(resetAt).toISOString(), updated_at: nowISO },
        { onConflict: 'key' }
      );
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: new Date(entry.reset_at).getTime() };
  }

  await supabase
    .from('rate_limits')
    .update({ count: entry.count + 1, updated_at: nowISO })
    .eq('key', key);

  cleanupCounter++;
  if (cleanupCounter >= 20) {
    cleanupCounter = 0;
    supabase.from('rate_limits').delete().lt('reset_at', nowISO).then(() => {}, () => {});
  }

  return { allowed: true, remaining: limit - (entry.count + 1), resetAt: new Date(entry.reset_at).getTime() };
}

/**
 * Extract client IP from a request.
 *
 * On Vercel `x-real-ip` is set by our own edge proxy and cannot be spoofed by
 * the client, so it is the most reliable value. `x-forwarded-for` is only used
 * as a fallback in non-Vercel environments; its leftmost entry is
 * attacker-controlled and must be treated as a hint, never as proof of identity.
 */
export function getClientIp(req: Request): string {
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.split(',')[0].trim();
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}
