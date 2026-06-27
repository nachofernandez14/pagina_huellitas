import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { todayArgentina, argentinaDayUtcRange } from '@/lib/date';

// GET /api/admin/caja — list entries, newest first (optional ?year=YYYY, ?ventas=true, ?fecha=YYYY-MM-DD)
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

  if (incluirVentas) {
    const today = req.nextUrl.searchParams.get('fecha') || todayArgentina();
    const { start, end } = argentinaDayUtcRange(today);
    const { data: ventas, error: errVentas } = await admin
      .from('orders')
      .select('id, forma_pago, total, canal, estado, productos, guest_nombre, created_at')
      .gte('created_at', start)
      .lte('created_at', end);

    const ventasHoy: Record<string, number> = {};
    const detalleVentas: Array<{
      id: string;
      forma_pago: string;
      total: number;
      productos: { nombre: string; quantity: number; precio: number }[];
      guest_nombre: string | null;
      created_at: string;
    }> = [];

    if (!errVentas) {
      (ventas ?? []).forEach((v) => {
        const incluir =
          (v.canal === 'local' && v.estado !== 'cancelled') ||
          (!v.canal && v.estado === 'paid') ||
          (v.canal === 'web' && v.estado === 'paid');
        if (!incluir) return;
        const fp = v.forma_pago || 'otro';
        ventasHoy[fp] = (ventasHoy[fp] ?? 0) + Number(v.total);
        detalleVentas.push(v);
      });
    }

    return NextResponse.json({ entries: data, ventasHoy, detalleVentas });
  }

  return NextResponse.json(data);
}

// POST /api/admin/caja — create or update caja entry
// Recibe totales ingresados por el usuario; calcula pendiente = total - ventasLocales
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { fecha, saldo_inicial, ventas_efectivo, ventas_mercadopago, ventas_tarjeta, ventas_transferencia, notas } = body;

  if (!fecha) return NextResponse.json({ error: 'fecha requerida' }, { status: 400 });

  // Obtener ventas locales de la fecha para calcular pendiente
  const { start, end } = argentinaDayUtcRange(fecha);
  const { data: orders } = await admin
    .from('orders')
    .select('canal, estado, forma_pago, total')
    .gte('created_at', start)
    .lte('created_at', end);

  const locales = { efectivo: 0, transferencia: 0, tarjeta: 0 };
  (orders ?? []).forEach((o) => {
    if ((o.canal !== 'local' && o.canal !== null) || o.estado === 'cancelled') return;
    const fp = o.forma_pago || 'otro';
    if (fp === 'efectivo') locales.efectivo += Number(o.total);
    else if (fp === 'tarjeta') locales.tarjeta += Number(o.total);
    else locales.transferencia += Number(o.total);
  });

  const pendiente = (total: number, loc: number) => Math.max(0, total - loc);

  const totalEf = Number(ventas_efectivo) || 0;
  const totalTr = Number(ventas_transferencia) || 0;
  const totalTj = Number(ventas_tarjeta) || 0;

  const { data, error } = await admin
    .from('caja_diaria')
    .upsert({
      fecha,
      saldo_inicial: Number(saldo_inicial) || 0,
      ventas_efectivo: pendiente(totalEf, locales.efectivo),
      ventas_mercadopago: Number(ventas_mercadopago) || 0,
      ventas_tarjeta: pendiente(totalTj, locales.tarjeta),
      ventas_transferencia: pendiente(totalTr, locales.transferencia),
      ventas_locales_efectivo: locales.efectivo,
      ventas_locales_transferencia: locales.transferencia,
      ventas_locales_tarjeta: locales.tarjeta,
      notas: notas || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'fecha' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
