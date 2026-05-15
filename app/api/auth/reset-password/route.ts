import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// POST /api/auth/reset-password — sends a password reset email
export async function POST(req: NextRequest) {
  // Rate limit: 3 requests per IP per 15 minutes
  const ip = getClientIp(req);
  const rl = checkRateLimit(`reset-password:${ip}`, 3, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Esperá unos minutos e intentá nuevamente.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  const { email } = await req.json() as { email?: string };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const supabase = await createClient();

  // Always returns success to avoid user enumeration
  await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
    redirectTo: `${siteUrl}/recuperar-contrasena/nueva`,
  });

  return NextResponse.json({ ok: true });
}
