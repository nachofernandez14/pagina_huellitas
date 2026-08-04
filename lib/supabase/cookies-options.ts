import type { CookieOptions } from '@supabase/ssr';

const isProd =
  process.env.NODE_ENV === 'production' ||
  (process.env.NEXT_PUBLIC_SITE_URL ?? '').startsWith('https://');

export const authCookieOptions: CookieOptions = {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  secure: isProd,
  maxAge: 400 * 24 * 60 * 60,
};