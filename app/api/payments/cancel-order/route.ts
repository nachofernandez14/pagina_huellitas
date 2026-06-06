import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { orderId, preferenceId } = body as { orderId?: string; preferenceId?: string };

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
