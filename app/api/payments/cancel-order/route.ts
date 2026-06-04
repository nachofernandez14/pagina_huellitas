import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

  // Fetch the order and verify ownership via mp_preference_id
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, estado, mp_preference_id')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    // Return 200 to not expose order existence
    return NextResponse.json({ ok: true });
  }

  // Only cancel if the preference matches and the order is still pending
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
