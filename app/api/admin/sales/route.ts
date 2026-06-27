import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { argentinaDayUtcRange } from '@/lib/date';

// GET /api/admin/sales?from=2026-01-01&to=2026-12-31&canal=local
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const canal = searchParams.get('canal');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500);

  let query = admin
    .from('orders')
    .select('id, created_at, canal, estado, total, guest_nombre, guest_email, notas, forma_pago, productos')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (from) {
    const { start } = argentinaDayUtcRange(from);
    query = query.gte('created_at', start);
  }
  if (to) {
    const { end } = argentinaDayUtcRange(to);
    query = query.lte('created_at', end);
  }
  if (canal) query = query.eq('canal', canal);

  // Only paid web orders + all local (non-cancelled) orders
  query = query.or('and(canal.is.null,estado.eq.paid),and(canal.eq.web,estado.eq.paid),and(canal.eq.local,estado.neq.cancelled)');

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/sales — create a local sale
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { productos, total, guest_nombre, forma_pago, notas, descuento_manual } = body;

  if (!productos || !Array.isArray(productos) || productos.length === 0)
    return NextResponse.json({ error: 'productos requerido' }, { status: 400 });
  if (typeof total !== 'number' || total < 0)
    return NextResponse.json({ error: 'total inválido' }, { status: 400 });

  const { data, error } = await admin
    .from('orders')
    .insert({
      canal: 'local',
      estado: 'paid',
      productos,
      total,
      guest_nombre: guest_nombre || 'Venta local',
      forma_pago: forma_pago || 'efectivo',
      notas: notas || null,
      descuento_manual: descuento_manual || 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Decrementar stock de cada producto vendido en local
  for (const item of productos) {
    if (item.id && item.quantity) {
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

  return NextResponse.json(data, { status: 201 });
}
