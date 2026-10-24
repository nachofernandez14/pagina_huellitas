import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getCurrentUserId } from '@/lib/auth';
import { auditLog } from '@/lib/audit';
import { sendOrderStatusEmail, ESTADOS_CON_EMAIL } from '@/lib/email';
import { recordOrderEvent } from '@/lib/evidence';
import type { CartItem } from '@/types';

const VALID_ESTADOS = ['pending', 'paid', 'cancelled', 'failed', 'preparing', 'ready', 'shipped', 'delivered'];
/** Fulfilment states that should only be reached after the payment is verified. */
const FULFILMENT_ESTADOS = new Set(['paid', 'preparing', 'ready', 'shipped', 'delivered']);

// GET /api/admin/orders?estado=pending&canal=web&from=&to=&q=&limit=50&page=1
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const estado = searchParams.get('estado');
  const canal  = searchParams.get('canal');
  const from   = searchParams.get('from');
  const to     = searchParams.get('to');
  const q      = searchParams.get('q')?.trim();
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
  const page   = Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1);
  const offset = (page - 1) * limit;

  let query = admin
    .from('orders')
    .select(
      'id, created_at, canal, estado, total, tipo_entrega, zona, ' +
      'guest_nombre, guest_email, guest_telefono, guest_direccion, ' +
      'forma_pago, notas, productos, mp_preference_id, mp_payment_id, ' +
      'payment_status, payment_verified_at, payment_received, contact_verified',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (estado) query = query.eq('estado', estado);
  if (canal)  query = query.eq('canal', canal);
  if (from)   query = query.gte('created_at', `${from}T00:00:00`);
  if (to)     query = query.lte('created_at', `${to}T23:59:59`);
  if (q) {
    // Search by order id, MP payment id or customer email.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
    if (isUuid) {
      query = query.or(`id.eq.${q},mp_payment_id.eq.${q}`);
    } else {
      query = query.or(`guest_email.ilike.%${q}%,mp_payment_id.eq.${q}`);
    }
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, total: count ?? 0, page, limit });
}

// PATCH /api/admin/orders — actualizar estado del pedido
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { id, estado, notas, confirmOfflinePayment } = await req.json();
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  if (estado && !VALID_ESTADOS.includes(estado))
    return NextResponse.json({ error: 'estado inválido' }, { status: 400 });

  // Fetch current order before updating
  const { data: current, error: fetchErr } = await admin
    .from('orders')
    .select('estado, productos, canal, forma_pago, payment_status, guest_email, guest_nombre, tipo_entrega')
    .eq('id', id)
    .single();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  // ── Payment guard ──────────────────────────────────────────────────────────
  // An online (Mercado Pago) order must have a verified approved payment before
  // the workflow advances. Cash orders pay at delivery, so they are exempt.
  // Use confirmOfflinePayment to attest payment was received outside the web.
  const isWebMpOrder = current.canal === 'web' && current.forma_pago !== 'efectivo';
  const paymentVerified = current.payment_status === 'approved';
  const willFulfil = estado && FULFILMENT_ESTADOS.has(estado);

  if (willFulfil && isWebMpOrder && !paymentVerified) {
    if (!confirmOfflinePayment) {
      return NextResponse.json(
        {
          error:
            'El pago de este pedido no está verificado en Mercado Pago (payment_status=' +
            `${current.payment_status ?? 'pending'}). Usá "Conciliar" en el detalle, o marcá ` +
            '"Confirmar pago manual" si lo cobraste por otro canal.',
        },
        { status: 409 }
      );
    }
    await admin
      .from('orders')
      .update({ payment_status: 'approved', payment_verified_at: new Date().toISOString() })
      .eq('id', id);
    await recordOrderEvent(id, 'payment_manual_override', {
      source: 'admin',
      detail: { previousStatus: current.payment_status ?? null },
    });
  }
  // ───────────────────────────────────────────────────────────────────────────

  // Decrement stock when order is marked as delivered (only once)
  if (estado === 'delivered' && current.estado !== 'delivered') {
    const productos = (current.productos ?? []) as CartItem[];
    if (Array.isArray(productos)) {
      for (const item of productos) {
        const { data: prod } = await admin
          .from('products')
          .select('stock')
          .eq('id', item.id)
          .single();

        if (prod) {
          const newStock = Math.max(0, (prod.stock ?? 0) - item.quantity);
          await admin.from('products').update({ stock: newStock }).eq('id', item.id);
        }
      }
    }
  }

  const update: Record<string, unknown> = {};
  if (estado !== undefined) update.estado = estado;
  if (notas  !== undefined) update.notas  = notas;

  const { data, error } = await admin
    .from('orders')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (estado && estado !== current.estado) {
    await recordOrderEvent(id, 'status_changed', {
      source: 'admin',
      detail: { from: current.estado, to: estado },
    });
  }

  // Enviar email al cliente si el nuevo estado lo requiere
  if (estado && ESTADOS_CON_EMAIL.has(estado) && data?.guest_email) {
    sendOrderStatusEmail({
      to: data.guest_email,
      nombre: data.guest_nombre ?? null,
      orderId: data.id,
      estado,
      tipoEntrega: data.tipo_entrega ?? null,
    }).catch(() => { /* fallo silencioso */ });
  }

  auditLog({
    user_id: await getCurrentUserId(),
    action: 'order.update_status',
    entity_type: 'orders',
    entity_id: id,
    details: { from: current.estado, to: estado },
  });

  return NextResponse.json(data);
}
