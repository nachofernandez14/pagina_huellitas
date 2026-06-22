import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createOrder, cancelPendingOrdersByEmail } from '@/lib/orders';
import { createMercadoPagoPreference } from '@/lib/mercadopago';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import type { CartItem, GuestCheckoutData } from '@/types';

function generateCancelToken(orderId: string, preferenceId: string): string {
  const secret = process.env.CLAVE_SECRETA ?? 'cancel-token-fallback';
  return createHmac('sha256', secret)
    .update(`${orderId}:${preferenceId}`)
    .digest('hex');
}

export async function POST(req: NextRequest) {
  // Rate limiting: max 15 payment preference requests per IP per 10 minutes
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`payments:${ip}`, 15, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Esperá unos minutos e intentá nuevamente.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      }
    );
  }

  const body = await req.json();
  const {
    items,
    total,
    guest,
    delivery,
    promoCode,
  }: {
    items: CartItem[];
    total: number;
    guest?: GuestCheckoutData;
    delivery?: { tipoEntrega: 'retiro' | 'envio'; zona?: string; direccion?: string };
    promoCode?: string;
  } = body;

  // Validate input
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 });
  }
  if (typeof total !== 'number' || total <= 0) {
    return NextResponse.json({ error: 'Total inválido' }, { status: 400 });
  }

  // Check auth (optional — guest checkout doesn't require login)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !guest) {
    return NextResponse.json(
      { error: 'Datos de contacto requeridos para compra como invitado' },
      { status: 400 }
    );
  }

  // Para usuarios autenticados, validar que mandaron datos de entrega
  if (user && !guest) {
    if (!delivery?.tipoEntrega) {
      return NextResponse.json({ error: 'Seleccioná un tipo de entrega' }, { status: 400 });
    }
    if (delivery.tipoEntrega === 'envio' && (!delivery.zona || !delivery.direccion?.trim())) {
      return NextResponse.json({ error: 'Ingresá zona y dirección para envío' }, { status: 400 });
    }
  }

  if (guest) {
    // Validate guest fields
    if (!guest.nombre || !guest.email || !guest.telefono || !guest.tipoEntrega) {
      return NextResponse.json({ error: 'Completá todos los campos de contacto' }, { status: 400 });
    }
    if (guest.tipoEntrega === 'envio' && (!guest.zona || !guest.direccion?.trim())) {
      return NextResponse.json({ error: 'Ingresá zona y dirección para envío' }, { status: 400 });
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(guest.email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }
  }

  try {
    // ── Verify prices server-side against the database ──────────────────────
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
      if (dbProduct.precio === null || dbProduct.precio === undefined) {
        throw new Error(`El producto "${item.nombre}" no tiene precio configurado.`);
      }
      return { ...item, precio: Number(dbProduct.precio) };
    });

    const verifiedTotal = verifiedItems.reduce((sum, i) => sum + i.precio * i.quantity, 0);
    // ────────────────────────────────────────────────────────────────────────

    // ── Validate promo code server-side ─────────────────────────────────────
    let promoDiscount = 0;
    let validatedPromoCode: string | undefined;
    if (promoCode?.trim() && user) {
      // Only logged-in users can have promo codes (guests can't request them)
      const { data: promoData } = await supabase
        .from('promo_codes')
        .select('code, discount, min_order, used, email')
        .eq('code', promoCode.trim().toUpperCase())
        .eq('used', false)
        .maybeSingle();
      // Ownership check: code must belong to the authenticated user
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
    // ────────────────────────────────────────────────────────────────────────

    // Cancelar pedidos pendientes anteriores del mismo email (guest abandonado)
    const existingEmail = guest?.email ?? user?.email;
    if (existingEmail) {
      cancelPendingOrdersByEmail(existingEmail).catch(() => {});
    }

    // Para usuarios autenticados, buscar datos del perfil para guardar en el pedido
    let profile: { nombre?: string | null; email?: string | null; telefono?: string | null } | undefined;
    if (user && !guest) {
      const { data } = await supabase
        .from('profiles')
        .select('nombre, email, telefono')
        .eq('id', user.id)
        .single();
      profile = data ?? { email: user.email };
      // Si el perfil no tiene email guardado, usar el del auth
      if (!profile?.email) profile = { ...profile, email: user.email };
    }

    // Create order in DB
    const order = await createOrder({
      items: verifiedItems,
      total: finalTotal,
      userId: user?.id,
      guest: guest,
      delivery: !guest ? delivery : undefined,
      profile,
      promoCode: validatedPromoCode,
      promoDescuento: promoDiscount > 0 ? promoDiscount : undefined,
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

    // Create Mercado Pago preference
    const { id: mpId, init_point } = await createMercadoPagoPreference({
      items: verifiedItems,
      orderId: order.id,
      siteUrl,
      discount: promoDiscount > 0 ? promoDiscount : undefined,
    });

    // Save preference ID to order
    const { updateOrderPayment } = await import('@/lib/orders');
    await updateOrderPayment(order.id, mpId);

    const cancelToken = generateCancelToken(order.id, mpId);
    return NextResponse.json({ init_point, orderId: order.id, preferenceId: mpId, cancelToken });
  } catch (err: unknown) {
    const mpErr = err as { message?: string; code?: string; status?: number };
    console.error('[create-preference] MP error:', JSON.stringify(mpErr, null, 2));
    const msg = mpErr?.message ?? 'Error al crear el pago. Intentá nuevamente.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
