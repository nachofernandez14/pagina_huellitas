import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createVerificationToken } from '@/lib/verification-token';
import { sendVerificationEmail } from '@/lib/email';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`resend-verification:${ip}`, 3, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Esperá unos minutos.' },
      { status: 429 }
    );
  }

  const { email } = await req.json() as { email?: string };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const admin = createAdminClient();

  // Buscar usuario por email en la tabla profiles
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (profile) {
    const { data: userData } = await admin.auth.admin.getUserById(profile.id);
    if (userData?.user && !userData.user.email_confirmed_at) {
      const token = createVerificationToken(profile.id, normalizedEmail);
      const verificationLink = `${SITE_URL}/api/auth/confirm-email?token=${token}`;
      await sendVerificationEmail(normalizedEmail, verificationLink).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
