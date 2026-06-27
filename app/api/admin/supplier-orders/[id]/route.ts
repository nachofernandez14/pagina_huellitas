import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

const RECIBIDO_STATES = ['recibido', 'recibido_parcial'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { id } = await params;
  const { estado } = await req.json();

  const allowed = ['pendiente', 'recibido_parcial', 'recibido', 'cancelado'];
  if (!allowed.includes(estado))
    return NextResponse.json({ error: 'estado inválido' }, { status: 400 });

  // Fetch current order to detect transition to recibido
  const { data: current, error: fetchErr } = await admin
    .from('supplier_orders')
    .select('estado')
    .eq('id', id)
    .single();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  const wasNotRecibido = !RECIBIDO_STATES.includes(current.estado);
  const becomingRecibido = RECIBIDO_STATES.includes(estado);

  const priceChanges: Array<{ descripcion: string; oldPrice: number; newPrice: number }> = [];

  // Sumar stock y actualizar precio_costo solo si es transición a recibido
  if (wasNotRecibido && becomingRecibido) {
    const { data: items } = await admin
      .from('supplier_order_items')
      .select('*')
      .eq('supplier_order_id', id);

    if (items) {
      for (const item of items) {
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
    }
  }

  const { data, error } = await admin
    .from('supplier_orders')
    .update({ estado })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...data, priceChanges });
}
