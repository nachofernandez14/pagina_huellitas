import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPasswordResetEmail } from '@/lib/email';

const EMAIL_MAX = 254;

// POST /api/auth/reset-password — genera el link y envía mail propio (no Supabase)
export async function POST(req: NextRequest) {
  // Rate limit: 3 requests per IP per 15 minutes
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`reset-password:${ip}`, 3, 15 * 60 * 1000);
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
  if (!email || email.length > EMAIL_MAX || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Genera el link sin que Supabase envíe nada
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: { redirectTo: `${siteUrl}/recuperar-contrasena/nueva` },
    });

    if (error || !data?.properties?.action_link) {
      // Siempre respondemos OK para no revelar si el email existe
      return NextResponse.json({ ok: true });
    }

    await sendPasswordResetEmail(normalizedEmail, data.properties.action_link);
  } catch {
    // Fallo silencioso — no revelar si el email existe
  }

  return NextResponse.json({ ok: true });
}

