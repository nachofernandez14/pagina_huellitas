import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { verifyTurnstileToken } from '@/lib/turnstile';
import {
  isCheckoutVerificationConfigured,
  requestCheckoutEmailCode,
  type RequestMeta,
} from '@/lib/checkout-verification';
import { getRequestContext } from '@/lib/evidence';
import { sendCheckoutVerificationEmail } from '@/lib/email';

const EMAIL_MAX = 254;
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/payments/verify-email
 * Request a one-time 6-digit code to verify the guest checkout email.
 * Requires a solved Turnstile challenge and is rate limited per IP and per
 * email to prevent code spam / email bombing through our Resend account.
 */
export async function POST(req: NextRequest) {
  if (!isCheckoutVerificationConfigured()) {
    console.error('[verify-email] CLAVE_SECRETA no configurada');
    return NextResponse.json({ error: 'Configuración pendiente' }, { status: 500 });
  }

  const ctx: RequestMeta = getRequestContext(req);
  const rl = await checkRateLimit(`verify-email:ip:${ctx.ip}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Esperá unos minutos e intentá nuevamente.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  let body: { email?: string; turnstileToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const { email, turnstileToken } = body;

  if (!turnstileToken || !(await verifyTurnstileToken(turnstileToken))) {
    return NextResponse.json({ error: 'Verificación de seguridad fallada. Intentá de nuevo.' }, { status: 400 });
  }

  if (!email || email.length > EMAIL_MAX || !EMAIL_RX.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }

  const normalized = email.toLowerCase().trim();

  const rlEmail = await checkRateLimit(`verify-email:mail:${normalized}`, 3, 60 * 60 * 1000);
  if (!rlEmail.allowed) {
    return NextResponse.json(
      { error: 'Ya se enviaron varios códigos a este email. Probá de nuevo más tarde.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rlEmail.resetAt - Date.now()) / 1000)) } }
    );
  }

  const result = await requestCheckoutEmailCode(normalized, ctx);
  if (!result.ok) {
    return NextResponse.json({ error: 'No se pudo enviar el código. Intentá nuevamente.' }, { status: 500 });
  }

  await sendCheckoutVerificationEmail(normalized, result.code).catch((err) => {
    console.error('[verify-email] Resend delivery failed', err);
  });

  // The code lives in `result`; the email above delivered it.
  // Never echo the code in the response.
  return NextResponse.json({ sent: true });
}
