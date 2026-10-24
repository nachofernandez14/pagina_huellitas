import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import {
  confirmCheckoutEmailCode,
  type RequestMeta,
} from '@/lib/checkout-verification';
import { getRequestContext } from '@/lib/evidence';

const EMAIL_MAX = 254;
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/payments/verify-email/confirm
 * Exchange a 6-digit code for a short-lived signed checkout token.
 * Attempts are bounded both per IP (rate limit) and per code (max 5 in the
 * verification table), so brute-forcing the 6-digit space is not viable.
 */
export async function POST(req: NextRequest) {
  const ctx: RequestMeta = getRequestContext(req);
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`verify-email-confirm:ip:${ip}`, 15, 15 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Esperá unos minutos e intentá nuevamente.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  let body: { email?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const { email, code } = body;
  if (!email || email.length > EMAIL_MAX || !EMAIL_RX.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }
  if (!code || !/^\d{6}$/.test(code.trim())) {
    return NextResponse.json({ error: 'Código inválido' }, { status: 400 });
  }

  const normalized = email.toLowerCase().trim();
  const result = await confirmCheckoutEmailCode(normalized, code.trim(), ctx);

  if (!result.ok) {
    const messages: Record<string, string> = {
      expired: 'El código venció. Solicitá uno nuevo.',
      invalid: 'Código incorrecto. Verificá e intentá de nuevo.',
      'too-many-attempts': 'Demasiados intentos. Solicitá un código nuevo.',
      'server-error': 'No se pudo verificar el código. Intentá nuevamente.',
    };
    return NextResponse.json({ error: messages[result.reason] ?? 'Código inválido' }, { status: 400 });
  }

  return NextResponse.json({ verified: true, token: result.token });
}
