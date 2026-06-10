import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import { cacheLife, cacheTag } from 'next/cache';

async function fetchAdminStats(today: string, sevenDaysAgo: string) {
  'use cache';
  cacheLife('minutes');
  cacheTag('admin-stats');

  const admin = createAdminClient();

  const [todaySales, lowStock, topProducts, weekSales, stockValue, cajaSemana] = await Promise.all([
    // Today's sales by channel
    admin
      .from('orders')
      .select('total, canal, estado')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`),

    // Low stock (< 10)
    admin
      .from('products')
      .select('id, nombre, categoria, kg, stock')
      .eq('activo', true)
      .lt('stock', 10)
      .order('stock', { ascending: true })
      .limit(10),

    // Top products from view
    admin
      .from('top_selling_products')
      .select('*')
      .limit(5),

    // Last 7 days sales for chart
    admin
      .from('daily_sales_summary')
      .select('fecha, canal, cantidad_ventas, total_ventas')
      .gte('fecha', sevenDaysAgo)
      .order('fecha', { ascending: true }),

    // Total value of stock
    admin
      .from('products')
      .select('precio, stock')
      .eq('activo', true)
      .not('precio', 'is', null),

    // Caja diaria — últimos 7 días
    admin
      .from('caja_diaria')
      .select('fecha, ventas_efectivo, ventas_mercadopago, ventas_tarjeta, ventas_transferencia')
      .gte('fecha', sevenDaysAgo)
      .order('fecha', { ascending: true }),
  ]);

  return { todaySales, lowStock, topProducts, weekSales, stockValue, cajaSemana };
}

// GET /api/admin/stats — dashboard metrics
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];

  const { todaySales, lowStock, topProducts, weekSales, stockValue, cajaSemana } =
    await fetchAdminStats(today, sevenDaysAgo);

  // Aggregate today's totals from orders
  const paidOrders = (todaySales.data ?? []).filter(
    (o) => (o.canal === 'local') || o.estado === 'paid'
  );
  const totalOrdenesHoy = paidOrders.reduce((s, o) => s + Number(o.total), 0);
  const ventasHoyWeb = paidOrders.filter((o) => !o.canal || o.canal === 'web').length;
  const ventasHoyLocal = paidOrders.filter((o) => o.canal === 'local').length;

  // Aggregate today's caja diaria total
  const cajaHoy = (cajaSemana.data ?? []).find((r) => r.fecha === today);
  const totalCajaHoy = cajaHoy
    ? Number(cajaHoy.ventas_efectivo ?? 0)
      + Number(cajaHoy.ventas_mercadopago ?? 0)
      + Number(cajaHoy.ventas_tarjeta ?? 0)
      + Number(cajaHoy.ventas_transferencia ?? 0)
    : 0;

  const totalHoy = totalOrdenesHoy + totalCajaHoy;

  const valorEnStock = (stockValue.data ?? []).reduce(
    (s, p) => s + (Number(p.precio) * Number(p.stock)), 0
  );

  // Merge caja rows into weekSales as synthetic "local" entries so the chart shows them
  const cajaRows = (cajaSemana.data ?? []).map((r) => ({
    fecha: r.fecha,
    canal: 'caja' as const,
    cantidad_ventas: 1,
    total_ventas:
      Number(r.ventas_efectivo ?? 0)
      + Number(r.ventas_mercadopago ?? 0)
      + Number(r.ventas_tarjeta ?? 0)
      + Number(r.ventas_transferencia ?? 0),
  }));

  return NextResponse.json({
    totalHoy,
    totalCajaHoy,
    ventasHoyWeb,
    ventasHoyLocal,
    valorEnStock,
    lowStock: lowStock.data ?? [],
    topProducts: topProducts.data ?? [],
    weekSales: [...(weekSales.data ?? []), ...cajaRows],
  });
}
