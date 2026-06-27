import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { verifyVerificationToken } from '@/lib/verification-token';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// GET /api/auth/confirm-email?token=xxx — confirma email desde link en el correo
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/login?error=verificacion-invalida', SITE_URL));
  }

  const payload = verifyVerificationToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL('/login?error=verificacion-invalida', SITE_URL));
  }

  const { userId, email } = payload;

  const admin = createAdminClient();

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
  if (userError || !userData?.user) {
    return NextResponse.redirect(new URL('/login?error=verificacion-invalida', SITE_URL));
  }

  if (userData.user.email_confirmed_at) {
    return NextResponse.redirect(new URL('/login?confirmed=1', SITE_URL));
  }

  const { error: confirmError } = await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });

  if (confirmError) {
    return NextResponse.redirect(new URL('/login?error=verificacion-invalida', SITE_URL));
  }

  return NextResponse.redirect(new URL('/login?confirmed=1', SITE_URL));
}

// POST /api/auth/confirm-email — confirma el email del usuario autenticado
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`confirm-email:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Esperá unos minutos.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    email_confirm: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
