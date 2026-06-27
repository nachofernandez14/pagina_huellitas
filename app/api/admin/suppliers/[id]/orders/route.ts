import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { id } = await params;
  const { items, notas, fecha } = await req.json();

  if (!items || !Array.isArray(items) || items.length === 0)
    return NextResponse.json({ error: 'items requerido' }, { status: 400 });

  const total = items.reduce((s: number, i: { cantidad: number; precio_unitario: number }) => s + i.cantidad * i.precio_unitario, 0);

  // El pedido se crea como recibido porque la mercadería ya llegó
  const { data: order, error: orderErr } = await admin
    .from('supplier_orders')
    .insert({ supplier_id: id, fecha: fecha || new Date().toISOString().split('T')[0], estado: 'recibido', total, notas: notas || null })
    .select()
    .single();

  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });

  const orderItems = items.map((i: { product_id?: string | null; descripcion: string; cantidad: number; precio_unitario: number }) => ({
    supplier_order_id: order.id,
    product_id: i.product_id || null,
    descripcion: i.descripcion,
    cantidad: i.cantidad,
    precio_unitario: i.precio_unitario,
    subtotal: i.cantidad * i.precio_unitario,
  }));

  const { error: itemsErr } = await admin.from('supplier_order_items').insert(orderItems);

  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });

  // Sumar stock y actualizar precio_costo de cada producto
  const priceChanges: Array<{ descripcion: string; oldPrice: number; newPrice: number }> = [];

  for (const item of orderItems) {
    if (!item.product_id) continue;

    const { data: prod } = await admin
      .from('products')
      .select('stock, precio_costo')
      .eq('id', item.product_id)
      .single();

    if (prod) {
      const newStock = (prod.stock ?? 0) + item.cantidad;
      const updateData: Record<string, unknown> = { stock: newStock };

      if (item.precio_unitario !== prod.precio_costo) {
        updateData.precio_costo = item.precio_unitario;
        priceChanges.push({
          descripcion: item.descripcion,
          oldPrice: prod.precio_costo ?? 0,
          newPrice: item.precio_unitario,
        });
      }

      await admin.from('products').update(updateData).eq('id', item.product_id);
    }
  }

  return NextResponse.json({ ...order, priceChanges }, { status: 201 });
}
