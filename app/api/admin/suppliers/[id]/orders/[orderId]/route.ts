import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { id: _id, orderId } = await params;
  const { items, notas, fecha } = await req.json();

  if (!items || !Array.isArray(items) || items.length === 0)
    return NextResponse.json({ error: 'items requerido' }, { status: 400 });

  // Get old items before updating
  const { data: oldItems } = await admin
    .from('supplier_order_items')
    .select('*')
    .eq('supplier_order_id', orderId);

  const oldByProduct = new Map(oldItems?.filter((i) => i.product_id).map((i) => [i.product_id, i]));

  // Adjust stock based on differences
  const priceChanges: Array<{ descripcion: string; oldPrice: number; newPrice: number }> = [];

  for (const item of items) {
    if (!item.product_id) continue;

    const old = oldByProduct.get(item.product_id);
    const qtyDelta = item.cantidad - (old?.cantidad ?? 0);

    if (qtyDelta !== 0 || !old) {
      const { data: prod } = await admin
        .from('products')
        .select('stock, precio_costo')
        .eq('id', item.product_id)
        .single();

      if (prod) {
        const newStock = Math.max(0, (prod.stock ?? 0) + qtyDelta);
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
  }

  // Products removed from order — subtract their old stock
  const newProductIds = new Set(items.filter((i: { product_id?: string }) => i.product_id).map((i: { product_id: string }) => i.product_id));
  for (const [prodId, oldItem] of oldByProduct) {
    if (!newProductIds.has(prodId)) {
      const { data: prod } = await admin
        .from('products')
        .select('stock')
        .eq('id', prodId)
        .single();

      if (prod) {
        const newStock = Math.max(0, (prod.stock ?? 0) - oldItem.cantidad);
        await admin.from('products').update({ stock: newStock }).eq('id', prodId);
      }
    }
  }

  // Recalculate total
  const total = items.reduce((s: number, i: { cantidad: number; precio_unitario: number }) => s + i.cantidad * i.precio_unitario, 0);

  // Delete old items and insert new ones
  const { error: delErr } = await admin.from('supplier_order_items').delete().eq('supplier_order_id', orderId);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  const newItems = items.map((i: { product_id?: string | null; descripcion: string; cantidad: number; precio_unitario: number }) => ({
    supplier_order_id: orderId,
    product_id: i.product_id || null,
    descripcion: i.descripcion,
    cantidad: i.cantidad,
    precio_unitario: i.precio_unitario,
    subtotal: i.cantidad * i.precio_unitario,
  }));

  const { error: insErr } = await admin.from('supplier_order_items').insert(newItems);
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  // Update order total, fecha, notas
  const updateData: Record<string, unknown> = { total };
  if (fecha !== undefined) updateData.fecha = fecha;
  if (notas !== undefined) updateData.notas = notas;

  const { data: order, error: updateErr } = await admin
    .from('supplier_orders')
    .update(updateData)
    .eq('id', orderId)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ...order, priceChanges });
}
