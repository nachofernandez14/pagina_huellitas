import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { createVerificationToken } from '@/lib/verification-token';
import { sendVerificationEmail } from '@/lib/email';

const EMAIL_MAX = 254;
const PASS_MAX = 128;
const NOMBRE_MAX = 100;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

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

  const { email, password, nombre, turnstileToken } = await req.json() as {
    email?: string;
    password?: string;
    nombre?: string;
    turnstileToken?: string;
  };

  if (!turnstileToken || !(await verifyTurnstileToken(turnstileToken))) {
    return NextResponse.json({ error: 'Verificación de seguridad fallada. Intentá de nuevo.' }, { status: 400 });
  }

  if (!email || email.length > EMAIL_MAX || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }
  if (!password || password.length < 8 || password.length > PASS_MAX) {
    return NextResponse.json({ error: 'La contraseña debe tener entre 8 y 128 caracteres' }, { status: 400 });
  }
  if (!nombre || nombre.trim().length < 2 || nombre.trim().length > NOMBRE_MAX) {
    return NextResponse.json({ error: 'El nombre debe tener entre 2 y 100 caracteres' }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const admin = createAdminClient();

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

  const userId = data.user.id;

  // Crear perfil en la tabla profiles con el nombre del registro
  try {
    await admin.from('profiles').upsert({
      id: userId,
      nombre: nombre.trim(),
      email: normalizedEmail,
      rol: 'cliente',
    });
  } catch {
    // Si ya existe (trigger de Supabase), se ignora
  }

  const token = createVerificationToken(userId, normalizedEmail);
  const verificationLink = `${SITE_URL}/api/auth/confirm-email?token=${token}`;

  await sendVerificationEmail(normalizedEmail, verificationLink).catch(() => {
    // Error silencioso — el usuario se creó igual, puede reenviar desde login
  });

  return NextResponse.json({ ok: true });
}
