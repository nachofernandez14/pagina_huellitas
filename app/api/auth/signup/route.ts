import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendConfirmationEmail } from '@/lib/email';

const EMAIL_MAX = 254;
const PASS_MAX = 128;
const NOMBRE_MAX = 100;

// POST /api/auth/signup — crea el usuario sin confirmar, genera el link y manda el email nosotros
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`signup:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Esperá unos minutos e intentá nuevamente.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  const { email, password, nombre } = await req.json() as {
    email?: string;
    password?: string;
    nombre?: string;
  };

  if (!email || email.length > EMAIL_MAX || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }
  if (!password || password.length < 8 || password.length > PASS_MAX) {
    return NextResponse.json({ error: 'La contraseña debe tener entre 8 y 128 caracteres' }, { status: 400 });
  }
  if (!nombre || nombre.trim().length < 2 || nombre.trim().length > NOMBRE_MAX) {
    return NextResponse.json({ error: 'El nombre debe tener entre 2 y 100 caracteres' }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const normalizedEmail = email.toLowerCase().trim();
  const admin = createAdminClient();

  // Crear usuario sin confirmar — Supabase no manda ningún email
  const { data, error } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: false,
    user_metadata: { nombre: nombre.trim() },
  });

  if (error) {
    if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already been registered')) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese email' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Generar el link de confirmación sin que Supabase envíe nada
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: normalizedEmail,
    options: { redirectTo: `${siteUrl}/login?confirmed=1` },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error('[signup] Error generando link de confirmación:', linkError);
    // El usuario existe pero no podemos mandar el link — retornamos ok igual
    return NextResponse.json({ ok: true });
  }

  // Mandar nuestro propio email de confirmación
  sendConfirmationEmail(normalizedEmail, nombre.trim(), linkData.properties.action_link).catch((err) => {
    console.error('[signup] Error enviando email de confirmación:', err);
  });

  return NextResponse.json({ ok: true });
}
