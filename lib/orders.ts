import { createAdminClient } from '@/lib/supabase/admin';
import type { CartItem, GuestCheckoutData, Order } from '@/types';
import { sendOrderConfirmationEmail, sendNewOrderNotificationToAdmin } from '@/lib/email';

export async function createOrder(params: {
  items: CartItem[];
  total: number;
  userId?: string;
  guest?: GuestCheckoutData;
  delivery?: { tipoEntrega: 'retiro' | 'envio'; zona?: string; direccion?: string };
  profile?: { nombre?: string | null; email?: string | null; telefono?: string | null };
  formaPago?: string;
  promoCode?: string;
  promoDescuento?: number;
}): Promise<Order> {
  const { items, total, userId, guest, delivery, profile, formaPago, promoCode, promoDescuento } = params;
  const supabase = createAdminClient();

  const payload: Record<string, unknown> = {
    productos: items,
    total,
    estado: 'pending',
  };

  if (formaPago) payload.forma_pago = formaPago;
  if (promoCode) payload.promo_code = promoCode;
  if (promoDescuento) payload.promo_descuento = promoDescuento;

  if (userId) {
    payload.user_id = userId;
    // Guardar snapshot del perfil para mostrar en admin sin necesidad de hacer join
    if (profile?.nombre) payload.guest_nombre = profile.nombre;
    if (profile?.email) payload.guest_email = profile.email;
    if (profile?.telefono) payload.guest_telefono = profile.telefono;
  } else if (guest) {
    payload.guest_email = guest.email;
    payload.guest_nombre = guest.nombre;
    payload.guest_telefono = guest.telefono;
    payload.guest_direccion = guest.direccion ?? null;
  }

  // Datos de entrega (vienen de guest o de delivery para usuarios autenticados)
  const entregaInfo = guest
    ? { tipoEntrega: guest.tipoEntrega, zona: guest.zona, direccion: guest.direccion }
    : delivery;

  if (entregaInfo?.tipoEntrega) {
    payload.tipo_entrega = entregaInfo.tipoEntrega;
    payload.zona = entregaInfo.zona ?? null;
    if (entregaInfo.tipoEntrega === 'envio') {
      payload.guest_direccion = entregaInfo.direccion ?? null;
    }
  }

  const { data, error } = await supabase
    .from('orders')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Order;
}

export async function updateOrderPayment(
  orderId: string,
  mpPreferenceId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('orders')
    .update({ mp_preference_id: mpPreferenceId })
    .eq('id', orderId);

  if (error) throw new Error(error.message);
}

export async function markOrderPaid(
  orderId: string,
  mpPaymentId: string,
  formaPago?: string,
): Promise<void> {
  const supabase = createAdminClient();
  const update: Record<string, unknown> = { estado: 'paid', mp_payment_id: mpPaymentId };
  if (formaPago) update.forma_pago = formaPago;
  const { data: order, error } = await supabase
    .from('orders')
    .update(update)
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Mark promo code as used if the order had one
  if (order?.promo_code) {
    markPromoCodeUsed(order.promo_code, orderId).catch(() => {});
  }

  // Send confirmation email now that payment is confirmed
  if (order?.guest_email) {
    const o = order as Order;
    sendOrderConfirmationEmail({
      to: o.guest_email!,
      nombre: o.guest_nombre ?? null,
      orderId: o.id,
      items: o.productos,
      total: o.total,
      tipoEntrega: o.tipo_entrega ?? null,
      zona: o.zona ?? null,
      direccion: o.tipo_entrega === 'envio' ? (o.guest_direccion ?? null) : null,
      formaPago: o.forma_pago ?? formaPago ?? null,
    }).catch(() => { /* silent — never block the payment confirmation */ });
  }

  // Notify admin about the new paid order
  if (order?.guest_email) {
    const o = order as Order;
    sendNewOrderNotificationToAdmin({
      nombre: o.guest_nombre ?? null,
      email: o.guest_email!,
      telefono: o.guest_telefono ?? null,
      orderId: o.id,
      items: o.productos,
      total: o.total,
      tipoEntrega: o.tipo_entrega ?? null,
      zona: o.zona ?? null,
      direccion: o.tipo_entrega === 'envio' ? (o.guest_direccion ?? null) : null,
      formaPago: o.forma_pago ?? formaPago ?? 'mp',
      metodoPago: 'Mercado Pago',
    }).catch(() => {});
  }
}

export async function markPromoCodeUsed(code: string, orderId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from('promo_codes')
    .update({ used: true, used_at: new Date().toISOString(), used_in_order_id: orderId })
    .eq('code', code)
    .eq('used', false);
}

/** Cancels a pending order — idempotent, no-op if already paid/cancelled */
export async function cancelOrder(orderId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from('orders')
    .update({ estado: 'cancelled' })
    .eq('id', orderId)
    .eq('estado', 'pending'); // Only cancel if still pending
}

/**
 * Cancela pedidos MP pendientes del mismo email que tengan más de 30 minutos
 * (nunca se pagaron, el usuario cerró la pestaña de MP).
 * No afecta pedidos en efectivo ni pedidos recientes (evita race conditions
 * con el webhook que tarda en marcar como 'paid').
 */
export async function cancelPendingOrdersByEmail(email: string): Promise<void> {
  const supabase = createAdminClient();
  const hace30min = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  await supabase
    .from('orders')
    .update({ estado: 'cancelled' })
    .eq('guest_email', email)
    .eq('estado', 'pending')
    .not('mp_preference_id', 'is', null)
    .lt('created_at', hace30min); // Solo órdenes viejas (>30 min)
}
