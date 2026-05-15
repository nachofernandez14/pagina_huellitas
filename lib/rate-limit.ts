/**
 * Simple in-memory sliding-window rate limiter.
 * Works per-process (fine for small deployments / single Vercel instance).
 * For multi-instance production, replace backing store with Vercel KV or Redis.
 */

interface WindowEntry {
  count: number;
  resetAt: number; // epoch ms
}

const store = new Map<string, WindowEntry>();

/** Clean up expired entries so memory doesn't grow unbounded */
function pruneExpired() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
}

/**
 * @param key      Unique key (e.g. `"ip:payments:1.2.3.4"`)
 * @param limit    Max requests allowed in the window
 * @param windowMs Window duration in milliseconds
 * @returns `{ allowed: boolean; remaining: number; resetAt: number }`
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  // Occasionally prune stale entries
  if (Math.random() < 0.05) pruneExpired();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // First request in this window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/** Extract client IP from a Next.js Request */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
