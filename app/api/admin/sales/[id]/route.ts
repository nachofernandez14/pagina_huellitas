import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getCurrentUserId } from '@/lib/auth';
import { auditLog } from '@/lib/audit';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const { data: existing, error: fetchError } = await admin
    .from('orders')
    .select('id, canal, estado, productos, created_at')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
  }

  if (existing.canal !== 'local') {
    return NextResponse.json({ error: 'Solo se pueden editar ventas locales' }, { status: 400 });
  }

  if (existing.estado === 'cancelled') {
    return NextResponse.json({ error: 'No se puede editar una venta cancelada' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.guest_nombre !== undefined) updates.guest_nombre = body.guest_nombre;
  if (body.forma_pago !== undefined) updates.forma_pago = body.forma_pago;
  if (body.notas !== undefined) updates.notas = body.notas;
  if (body.descuento_manual !== undefined) updates.descuento_manual = body.descuento_manual;
  if (body.total !== undefined) updates.total = body.total;

  if (body.fecha && /^\d{4}-\d{2}-\d{2}$/.test(body.fecha)) {
    const existingDate = new Date(existing.created_at);
    const timePart = existingDate.toTimeString().slice(0, 8);
    updates.created_at = `${body.fecha}T${timePart}`;
  }

  if (body.productos !== undefined) {
    const newProductos = body.productos as Array<{ id: string; quantity: number }>;
    if (!Array.isArray(newProductos) || newProductos.length === 0)
      return NextResponse.json({ error: 'productos requerido' }, { status: 400 });
    if (newProductos.some((p) => !p.id || !Number.isInteger(p.quantity) || p.quantity < 1))
      return NextResponse.json({ error: 'productos inválidos' }, { status: 400 });

    const oldProductos = (existing.productos ?? []) as Array<{ id: string; quantity: number }>;
    const oldKey = oldProductos.map((p) => `${p.id}-${p.quantity}`).sort().join(',');
    const newKey = newProductos.map((p) => `${p.id}-${p.quantity}`).sort().join(',');

    if (oldKey !== newKey) {
      for (const item of oldProductos) {
        if (item.id && item.quantity) {
          const { data: prod } = await admin
            .from('products')
            .select('stock')
            .eq('id', item.id)
            .single();
          if (prod) {
            const newStock = (prod.stock ?? 0) + item.quantity;
            await admin.from('products').update({ stock: newStock }).eq('id', item.id);
          }
        }
      }

      for (const item of newProductos) {
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
    }

    updates.productos = newProductos;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
  }

  const { data, error } = await admin
    .from('orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  auditLog({
    user_id: await getCurrentUserId(),
    action: 'sale.update',
    entity_type: 'orders',
    entity_id: id,
    details: { updated_fields: Object.keys(updates) },
  });

  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { id } = await params;

  const { data: existing, error: fetchError } = await admin
    .from('orders')
    .select('id, canal, estado, productos')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
  }

  if (existing.canal !== 'local') {
    return NextResponse.json({ error: 'Solo se pueden eliminar ventas locales' }, { status: 400 });
  }

  if (existing.estado === 'cancelled') {
    return NextResponse.json({ error: 'La venta ya está cancelada' }, { status: 400 });
  }

  const productos = (existing.productos ?? []) as Array<{ id: string; quantity: number }>;
  for (const item of productos) {
    if (item.id && item.quantity) {
      const { data: prod } = await admin
        .from('products')
        .select('stock')
        .eq('id', item.id)
        .single();
      if (prod) {
        const newStock = (prod.stock ?? 0) + item.quantity;
        await admin.from('products').update({ stock: newStock }).eq('id', item.id);
      }
    }
  }

  const { error } = await admin.from('orders').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  auditLog({
    user_id: await getCurrentUserId(),
    action: 'sale.delete',
    entity_type: 'orders',
    entity_id: id,
    details: { productos: productos.length },
  });

  return NextResponse.json({ message: 'Venta eliminada' });
}
