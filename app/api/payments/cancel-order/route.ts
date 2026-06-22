import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

function generateCancelToken(orderId: string, preferenceId: string): string {
  const secret = process.env.CLAVE_SECRETA ?? 'cancel-token-fallback';
  return createHmac('sha256', secret)
    .update(`${orderId}:${preferenceId}`)
    .digest('hex');
}

export async function POST(req: NextRequest) {
  // Rate limiting: max 10 cancel requests per IP per minute
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`cancel-order:${ip}`, 10, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { orderId, preferenceId, cancelToken } = body as {
    orderId?: string;
    preferenceId?: string;
    cancelToken?: string;
  };

  if (!orderId || !preferenceId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, estado, mp_preference_id, user_id')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ ok: true });
  }

  if (order.user_id) {
    const userSupabase = await createClient();
    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user || user.id !== order.user_id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  } else {
    // Guest orders: require a valid cancel token
    const expectedToken = generateCancelToken(orderId, preferenceId);
    if (!cancelToken || cancelToken !== expectedToken) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  }

  if (order.mp_preference_id !== preferenceId || order.estado !== 'pending') {
    return NextResponse.json({ ok: true });
  }

  await supabase
    .from('orders')
    .update({ estado: 'cancelled' })
    .eq('id', orderId)
    .eq('estado', 'pending');

  return NextResponse.json({ ok: true });
}
