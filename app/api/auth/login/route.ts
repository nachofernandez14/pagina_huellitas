import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { verifyTurnstileToken } from '@/lib/turnstile';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Esperá unos minutos e intentá nuevamente.' },
      { status: 429 }
    );
  }

  const { email, password, turnstileToken } = await req.json() as {
    email?: string;
    password?: string;
    turnstileToken?: string;
  };

  if (!turnstileToken || !(await verifyTurnstileToken(turnstileToken))) {
    return NextResponse.json({ error: 'Verificación de seguridad fallada. Intentá de nuevo.' }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }
  if (!password || password.length < 1) {
    return NextResponse.json({ error: 'Contraseña inválida' }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('not confirmed')) {
      return NextResponse.json({
        error: 'Email no confirmado. Revisá tu casilla de correo.',
        emailNotConfirmed: true,
      }, { status: 401 });
    }
    if (msg.includes('invalid') || msg.includes('credentials')) {
      return NextResponse.json({ error: 'Email o contraseña incorrectos.' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  return response;
}
