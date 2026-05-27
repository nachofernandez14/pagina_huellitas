import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createOrder } from '@/lib/orders';
import { sendOrderConfirmationEmail } from '@/lib/email';
import type { CartItem, GuestCheckoutData } from '@/types';

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    items: CartItem[];
    total: number;
    guest?: GuestCheckoutData;
    delivery?: { tipoEntrega: 'retiro' | 'envio'; zona?: string; direccion?: string };
  };

  const { items, total, guest, delivery } = body;

  if (!items?.length || !total) {
    return NextResponse.json({ error: 'Datos de pedido inválidos' }, { status: 400 });
  }

  // Check if user is logged in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profileSnapshot: { nombre?: string | null; email?: string | null; telefono?: string | null } | undefined;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('nombre, telefono')
      .eq('id', user.id)
      .single();
    profileSnapshot = { nombre: profile?.nombre, email: user.email, telefono: profile?.telefono };
  }

  try {
    const order = await createOrder({
      items,
      total,
      userId: user?.id,
      guest: !user ? guest : undefined,
      delivery: user ? delivery : undefined,
      profile: profileSnapshot,
      formaPago: 'efectivo',
    });

    // Send confirmation email immediately for cash orders
    if (order.guest_email) {
      const entregaInfo = !user ? guest : delivery;
      sendOrderConfirmationEmail({
        to: order.guest_email,
        nombre: order.guest_nombre ?? null,
        orderId: order.id,
        items,
        total,
        tipoEntrega: entregaInfo?.tipoEntrega ?? null,
        zona: entregaInfo?.tipoEntrega === 'envio' ? (entregaInfo.zona ?? null) : null,
        direccion: entregaInfo?.tipoEntrega === 'envio' ? (entregaInfo.direccion ?? null) : null,
        formaPago: 'efectivo',
      }).catch(() => {});
    }

    return NextResponse.json({ orderId: order.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al crear pedido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
