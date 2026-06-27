import { createAdminClient } from '@/lib/supabase/admin';

let cleanupCounter = 0;

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

/** Extract client IP from a Next.js Request */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
