import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createOrder } from '@/lib/orders';
import { sendOrderConfirmationEmail, sendNewOrderNotificationToAdmin } from '@/lib/email';
import type { CartItem, GuestCheckoutData } from '@/types';

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    items: CartItem[];
    total: number;
    guest?: GuestCheckoutData;
    delivery?: { tipoEntrega: 'retiro' | 'envio'; zona?: string; direccion?: string };
    promoCode?: string;
  };

  const { items, total, guest, delivery, promoCode } = body;

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
    // ── Verify prices server-side against the database ────────────────────
    const productIds = items.map((i) => i.id);
    const { data: dbProducts, error: dbError } = await supabase
      .from('products')
      .select('id, precio, activo')
      .in('id', productIds);

    if (dbError || !dbProducts) {
      return NextResponse.json({ error: 'No se pudo verificar los precios. Intentá nuevamente.' }, { status: 500 });
    }

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));
    const verifiedItems: CartItem[] = items.map((item) => {
      const dbProduct = productMap.get(item.id);
      if (!dbProduct || !dbProduct.activo) {
        throw new Error(`El producto "${item.nombre}" ya no está disponible.`);
      }
      return { ...item, precio: Number(dbProduct.precio) };
    });
    const verifiedTotal = verifiedItems.reduce((sum, i) => sum + i.precio * i.quantity, 0);
    // ─────────────────────────────────────────────────────────────────────

    // ── Validate promo code server-side ────────────────────────────────────
    let promoDiscount = 0;
    let validatedPromoCode: string | undefined;
    if (promoCode?.trim() && user) {
      // Only logged-in users can have promo codes
      const { data: promoData } = await supabase
        .from('promo_codes')
        .select('code, discount, min_order, used, email')
        .eq('code', promoCode.trim().toUpperCase())
        .eq('used', false)
        .maybeSingle();
      // Ownership check + use verifiedTotal (never client-supplied total)
      if (
        promoData &&
        promoData.email.toLowerCase() === user.email!.toLowerCase() &&
        verifiedTotal >= promoData.min_order
      ) {
        promoDiscount = promoData.discount;
        validatedPromoCode = promoData.code;
      }
    }
    const finalTotal = Math.max(0, verifiedTotal - promoDiscount);
    // ───────────────────────────────────────────────────────────────────────

    const order = await createOrder({
      items: verifiedItems,
      total: finalTotal,
      userId: user?.id,
      guest: !user ? guest : undefined,
      delivery: user ? delivery : undefined,
      profile: profileSnapshot,
      formaPago: 'efectivo',
      promoCode: validatedPromoCode,
      promoDescuento: promoDiscount > 0 ? promoDiscount : undefined,
    });

    // Mark promo code as used immediately (cash — no async payment confirmation)
    if (validatedPromoCode) {
      const { markPromoCodeUsed } = await import('@/lib/orders');
      await markPromoCodeUsed(validatedPromoCode, order.id).catch(() => {});
    }

    // Send confirmation email immediately for cash orders
    if (order.guest_email) {
      const entregaInfo = !user ? guest : delivery;
      sendOrderConfirmationEmail({
        to: order.guest_email,
        nombre: order.guest_nombre ?? null,
        orderId: order.id,
        items,
        total: finalTotal,
        tipoEntrega: entregaInfo?.tipoEntrega ?? null,
        zona: entregaInfo?.tipoEntrega === 'envio' ? (entregaInfo.zona ?? null) : null,
        direccion: entregaInfo?.tipoEntrega === 'envio' ? (entregaInfo.direccion ?? null) : null,
        formaPago: 'efectivo',
      }).catch(() => {});
    }

    // Notify admin about the new cash order
    const adminEmail = order.guest_email;
    if (adminEmail) {
      const entregaInfo = !user ? guest : delivery;
      sendNewOrderNotificationToAdmin({
        nombre: order.guest_nombre ?? null,
        email: adminEmail,
        telefono: order.guest_telefono ?? null,
        orderId: order.id,
        items,
        total: finalTotal,
        tipoEntrega: entregaInfo?.tipoEntrega ?? null,
        zona: entregaInfo?.tipoEntrega === 'envio' ? (entregaInfo.zona ?? null) : null,
        direccion: entregaInfo?.tipoEntrega === 'envio' ? (entregaInfo.direccion ?? null) : null,
        formaPago: 'efectivo',
        metodoPago: 'Efectivo',
      }).catch(() => {});
    }

    return NextResponse.json({ orderId: order.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al crear pedido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
