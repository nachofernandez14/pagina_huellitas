import { createAdminClient } from '@/lib/supabase/admin';
import { recordOrderEvent } from '@/lib/evidence';
import type { CartItem, GuestCheckoutData, Order } from '@/types';
import { sendOrderConfirmationEmail, sendNewOrderNotificationToAdmin } from '@/lib/email';

/** MP amount vs order total tolerance (ARS cents rounding). */
const AMOUNT_TOLERANCE = 0.5;

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
  contactVerified?: boolean;
}): Promise<Order> {
  const { items, total, userId, guest, delivery, profile, formaPago, promoCode, promoDescuento, contactVerified } = params;
  const supabase = createAdminClient();

  const payload: Record<string, unknown> = {
    productos: items,
    total,
    estado: 'pending',
    // Payment lifecycle starts here; MP confirmation updates it via webhook.
    payment_status: formaPago === 'efectivo' ? 'cash_pending' : 'pending',
  };

  if (formaPago) payload.forma_pago = formaPago;
  if (promoCode) payload.promo_code = promoCode;
  if (promoDescuento) payload.promo_descuento = promoDescuento;
  if (contactVerified) payload.contact_verified = true;

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

  const order = data as Order;
  await recordOrderEvent(order.id, 'order_created', {
    source: 'client',
    detail: { total, formaPago: formaPago ?? 'mp', items: items.length, contactEmail: order.guest_email ?? null },
  });
  return order;
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

export interface MarkPaidResult {
  /** Whether this call transitioned the order to paid (false = no-op). */
  applied: boolean;
  /** True when a previous processing already marked this order paid. */
  duplicate: boolean;
}

/**
 * Mark an order as paid after Mercado Pago confirmed an approved payment.
 * Idempotent and race-safe: the DB update only applies to a `pending` order,
 * so webhook + return-page processing in any order ends in the same state.
 */
export async function markOrderPaid(
  orderId: string,
  mpPaymentId: string,
  formaPago?: string,
  payment?: { amount?: number | null; currency?: string | null }
): Promise<MarkPaidResult> {
  const supabase = createAdminClient();

  // ── Amount verification: MP's own record must match the order total ──────
  const { data: current, error: fetchError } = await supabase
    .from('orders')
    .select('total, estado, mp_payment_id')
    .eq('id', orderId)
    .single();

  if (fetchError || !current) {
    await recordOrderEvent(orderId, 'payment_unknown_order', {
      source: 'webhook',
      detail: { mpPaymentId, error: fetchError?.message ?? 'not found' },
    });
    throw new Error('Pedido no encontrado');
  }

  const amountMismatch =
    payment?.amount != null &&
    current.total != null &&
    Math.abs(payment.amount - Number(current.total)) > AMOUNT_TOLERANCE;

  const nowISO = new Date().toISOString();
  const update: Record<string, unknown> = {
    // Keep mismatched payments out of the approved state so fulfilment stays
    // blocked and the reconciliation sweep continues to pick them up.
    payment_status: amountMismatch ? 'in_process' : 'approved',
    payment_verified_at: nowISO,
    mp_payment_id: mpPaymentId,
    ...(payment?.amount != null ? { payment_received: payment.amount } : {}),
  };
  if (formaPago) update.forma_pago = formaPago;
  if (!amountMismatch) update.estado = 'paid';

  // Race-safe transition: this guarded update can only ever succeed once,
  // because it only applies to an order still in `pending`.
  const { data: order, error } = await supabase
    .from('orders')
    .update(update)
    .eq('id', orderId)
    .eq('estado', 'pending')
    .select()
    .maybeSingle();

  if (order) {
    if (amountMismatch) {
      // Money received but not the full order amount — flag for manual review
      // instead of silently fulfilling the order.
      await recordOrderEvent(orderId, 'amount_mismatch', {
        source: 'webhook',
        detail: { mpPaymentId, expected: Number(current.total), received: payment?.amount ?? null, currency: payment?.currency ?? null },
      });
      console.error(`[orders] amount mismatch on order ${orderId}: MP said ${payment?.amount}, order says ${current.total}`);
      return { applied: false, duplicate: false };
    }
    await recordOrderEvent(orderId, 'payment_approved', {
      source: 'webhook',
      detail: { mpPaymentId, amount: payment?.amount ?? null, currency: payment?.currency ?? null },
    });
    notifyPaid(order as Order, mpPaymentId, formaPago);
    return { applied: true, duplicate: false };
  }

  if (error) {
    // Real DB failure — never silently swallow it.
    await recordOrderEvent(orderId, 'payment_update_failed', {
      source: 'webhook',
      detail: { mpPaymentId, error: error.message },
    });
    throw new Error(error.message);
  }

  // No rows updated → the order is no longer pending. Re-read its live state
  // (the snapshot above may be stale under concurrent webhook processing).
  const { data: nowState } = await supabase
    .from('orders')
    .select('estado, mp_payment_id')
    .eq('id', orderId)
    .single();

  if (nowState?.mp_payment_id === mpPaymentId) {
    // Already processed with this exact payment — idempotent no-op.
    return { applied: false, duplicate: true };
  }

  if (nowState && !['cancelled', 'failed'].includes(nowState.estado)) {
    // Already paid (a different payment id) or already advanced by an admin.
    await recordOrderEvent(orderId, 'payment_duplicate_different_id', {
      source: 'webhook',
      detail: { mpPaymentId, storedPaymentId: nowState.mp_payment_id, estado: nowState.estado },
    });
    return { applied: false, duplicate: true };
  }

  // Payment confirmed after the order was cancelled (late webhook) — money
  // received is authoritative, reopen the order as paid.
  const { data: forced, error: forceErr } = await supabase
    .from('orders')
    .update(update)
    .eq('id', orderId)
    .select()
    .maybeSingle();

  if (forceErr || !forced) {
    await recordOrderEvent(orderId, 'payment_update_failed', {
      source: 'webhook',
      detail: { mpPaymentId, error: forceErr?.message ?? 'no rows' },
    });
    throw new Error(forceErr?.message ?? 'No se pudo actualizar el pedido');
  }

  await recordOrderEvent(orderId, 'payment_after_cancel', {
    source: 'webhook',
    detail: { mpPaymentId },
  });

  if (!amountMismatch) {
    notifyPaid(forced as Order, mpPaymentId, formaPago);
    return { applied: true, duplicate: false };
  }
  return { applied: false, duplicate: false };
}

async function notifyPaid(order: Order, mpPaymentId: string, formaPago?: string): Promise<void> {
  if (!order?.guest_email) return;
  sendOrderConfirmationEmail({
    to: order.guest_email,
    nombre: order.guest_nombre ?? null,
    orderId: order.id,
    items: order.productos,
    total: order.total,
    tipoEntrega: order.tipo_entrega ?? null,
    zona: order.zona ?? null,
    direccion: order.tipo_entrega === 'envio' ? (order.guest_direccion ?? null) : null,
    formaPago: order.forma_pago ?? formaPago ?? null,
  }).catch(() => { /* silent — never block the payment confirmation */ });

  sendNewOrderNotificationToAdmin({
    nombre: order.guest_nombre ?? null,
    email: order.guest_email,
    telefono: order.guest_telefono ?? null,
    orderId: order.id,
    items: order.productos,
    total: order.total,
    tipoEntrega: order.tipo_entrega ?? null,
    zona: order.zona ?? null,
    direccion: order.tipo_entrega === 'envio' ? (order.guest_direccion ?? null) : null,
    formaPago: order.forma_pago ?? formaPago ?? 'mp',
    metodoPago: 'Mercado Pago',
  }).catch(() => {});
}

/**
 * Store a non-approved MP payment status (in_process, rejected, cancelled,
 * refunded, charged_back). Never overwrites an already-verified payment.
 */
export async function recordPaymentStatus(
  orderId: string | null,
  mpPaymentId: string,
  status: string,
  extra?: Record<string, unknown>
): Promise<void> {
  if (!orderId) return;

  const supabase = createAdminClient();

  // The ne('payment_status', 'approved') guard ensures a late in_process /
  // pending notification can never downgrade a verified payment.
  await supabase
    .from('orders')
    .update({ payment_status: status })
    .eq('id', orderId)
    .neq('payment_status', 'approved');


  await recordOrderEvent(orderId, `payment_${status}`, {
    source: 'webhook',
    detail: { mpPaymentId, ...(extra ?? {}) },
  });

  // A rejected/cancelled payment cancels an otherwise pending order so it
  // cannot be fulfilled.
  if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(status)) {
    await cancelOrder(orderId);
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

async function releasePromoCode(orderId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from('orders')
    .select('promo_code')
    .eq('id', orderId)
    .single();
  if (order?.promo_code) {
    await supabase
      .from('promo_codes')
      .update({ used: false, used_at: null, used_in_order_id: null })
      .eq('code', order.promo_code)
      .eq('used_in_order_id', orderId);
  }
}

/** Cancels a pending order — idempotent, no-op if already paid/cancelled */
export async function cancelOrder(orderId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from('orders')
    .update({ estado: 'cancelled' })
    .eq('id', orderId)
    .eq('estado', 'pending') // Only cancel if still pending
    .select('promo_code')
    .single();
  if (order) {
    await recordOrderEvent(orderId, 'order_cancelled', {
      source: 'system',
      detail: { reason: 'payment_not_confirmed' },
    });
  }
  if (order?.promo_code) {
    releasePromoCode(orderId).catch(() => {});
  }
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
  const { data: cancelled } = await supabase
    .from('orders')
    .update({ estado: 'cancelled' })
    .eq('guest_email', email)
    .eq('estado', 'pending')
    .not('mp_preference_id', 'is', null)
    .lt('created_at', hace30min)
    .select('id')
    .limit(10);

  for (const row of cancelled ?? []) {
    await recordOrderEvent(row.id, 'order_cancelled', {
      source: 'system',
      detail: { reason: 'abandoned_pending' },
    });
  }
}
