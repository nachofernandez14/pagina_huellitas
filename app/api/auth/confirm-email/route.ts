import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
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

  // The signed link must still match the account's current email. This also
  // prevents a stale link from confirming a subsequently changed address.
  if (userData.user.email?.toLowerCase().trim() !== email.toLowerCase().trim()) {
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
