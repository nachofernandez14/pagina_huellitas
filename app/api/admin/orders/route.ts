import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendOrderStatusEmail, ESTADOS_CON_EMAIL } from '@/lib/email';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single();
  if (!profile || profile.rol !== 'admin') return null;
  return createAdminClient();
}

// GET /api/admin/orders?estado=pending&canal=web&from=&to=&limit=50&page=1
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const estado = searchParams.get('estado');
  const canal  = searchParams.get('canal');
  const from   = searchParams.get('from');
  const to     = searchParams.get('to');
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
  const page   = Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1);
  const offset = (page - 1) * limit;

  let query = admin
    .from('orders')
    .select(
      'id, created_at, canal, estado, total, tipo_entrega, zona, ' +
      'guest_nombre, guest_email, guest_telefono, guest_direccion, ' +
      'forma_pago, notas, productos, mp_payment_id',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (estado) query = query.eq('estado', estado);
  if (canal)  query = query.eq('canal', canal);
  if (from)   query = query.gte('created_at', `${from}T00:00:00`);
  if (to)     query = query.lte('created_at', `${to}T23:59:59`);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, total: count ?? 0, page, limit });
}

// PATCH /api/admin/orders — actualizar estado del pedido
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { id, estado, notas } = await req.json();
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const allowed = ['pending', 'paid', 'cancelled', 'failed', 'preparing', 'ready', 'shipped', 'delivered'];
  if (estado && !allowed.includes(estado))
    return NextResponse.json({ error: 'estado inválido' }, { status: 400 });

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

  return NextResponse.json(data);
}
