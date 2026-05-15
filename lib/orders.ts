import { createAdminClient } from '@/lib/supabase/admin';
import type { CartItem, GuestCheckoutData, Order } from '@/types';

export async function createOrder(params: {
  items: CartItem[];
  total: number;
  userId?: string;
  guest?: GuestCheckoutData;
  delivery?: { tipoEntrega: 'retiro' | 'envio'; zona?: string; direccion?: string };
  profile?: { nombre?: string | null; email?: string | null; telefono?: string | null };
  formaPago?: string;
}): Promise<Order> {
  const { items, total, userId, guest, delivery, profile, formaPago } = params;
  const supabase = createAdminClient();

  const payload: Record<string, unknown> = {
    productos: items,
    total,
    estado: 'pending',
  };

  if (formaPago) payload.forma_pago = formaPago;

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
  const { error } = await supabase
    .from('orders')
    .update(update)
    .eq('id', orderId);

  if (error) throw new Error(error.message);
}
