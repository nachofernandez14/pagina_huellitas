import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

// GET /api/admin/caja — list entries, newest first (optional ?year=YYYY, ?ventas=true)
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const year = req.nextUrl.searchParams.get('year');
  const incluirVentas = req.nextUrl.searchParams.get('ventas') === 'true';

  let query = admin
    .from('caja_diaria')
    .select('*')
    .order('fecha', { ascending: false });

  if (year) {
    query = query
      .gte('fecha', `${year}-01-01`)
      .lte('fecha', `${year}-12-31`);
  }

  const { data, error } = await query.limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Si se solicita, incluir ventas registradas de HOY agrupadas por forma_pago
  // Solo incluye: ventas locales (no canceladas) + pedidos web pagos
  if (incluirVentas) {
    const today = new Date().toISOString().split('T')[0];
    const { data: ventas } = await admin
      .from('orders')
      .select('forma_pago, total, canal, estado')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);

    const ventasHoy: Record<string, number> = {};
    (ventas ?? []).forEach((v) => {
      // Solo contar: locales no cancelados + web pagos
      const incluir =
        (v.canal === 'local' && v.estado !== 'cancelled') ||
        (!v.canal && v.estado === 'paid') ||
        (v.canal === 'web' && v.estado === 'paid');
      if (!incluir) return;
      const fp = v.forma_pago || 'otro';
      ventasHoy[fp] = (ventasHoy[fp] ?? 0) + Number(v.total);
    });

    return NextResponse.json({ entries: data, ventasHoy });
  }

  return NextResponse.json(data);
}

// POST /api/admin/caja — create entry
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { fecha, saldo_inicial, ventas_efectivo, ventas_mercadopago, ventas_tarjeta, ventas_transferencia, notas } = body;

  if (!fecha) return NextResponse.json({ error: 'fecha requerida' }, { status: 400 });

  const { data, error } = await admin
    .from('caja_diaria')
    .upsert({
      fecha,
      saldo_inicial: saldo_inicial ?? 0,
      ventas_efectivo: ventas_efectivo ?? 0,
      ventas_mercadopago: ventas_mercadopago ?? 0,
      ventas_tarjeta: ventas_tarjeta ?? 0,
      ventas_transferencia: ventas_transferencia ?? 0,
      notas: notas || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'fecha' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
