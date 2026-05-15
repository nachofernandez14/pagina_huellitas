import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single();
  if (!profile || profile.rol !== 'admin') return null;
  return createAdminClient();
}

// GET /api/admin/suppliers/[id]/orders
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data, error } = await admin
    .from('supplier_orders')
    .select('*, supplier_order_items(*)')
    .eq('supplier_id', id)
    .order('fecha', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/suppliers/[id]/orders — create order
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { items, notas, fecha } = await req.json();
  if (!items || !Array.isArray(items) || items.length === 0)
    return NextResponse.json({ error: 'items requerido' }, { status: 400 });

  // Create order
  const { data: order, error: oe } = await admin
    .from('supplier_orders')
    .insert({ supplier_id: id, notas: notas || null, fecha: fecha || undefined })
    .select().single();
  if (oe) return NextResponse.json({ error: oe.message }, { status: 500 });

  // Create items
  const itemsToInsert = items.map((item: { descripcion: string; cantidad: number; precio_unitario: number; product_id?: string }) => ({
    supplier_order_id: order.id,
    descripcion: item.descripcion,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    product_id: item.product_id || null,
  }));
  const { error: ie } = await admin.from('supplier_order_items').insert(itemsToInsert);
  if (ie) return NextResponse.json({ error: ie.message }, { status: 500 });

  // Update precio_costo in product if it changed
  for (const item of items as { product_id?: string; precio_unitario: number }[]) {
    if (item.product_id && item.precio_unitario > 0) {
      const { data: prod } = await admin
        .from('products')
        .select('precio_costo')
        .eq('id', item.product_id)
        .single();
      if (prod && prod.precio_costo !== item.precio_unitario) {
        await admin
          .from('products')
          .update({ precio_costo: item.precio_unitario })
          .eq('id', item.product_id);
      }
    }
  }

  // Return updated order with items
  const { data: full } = await admin
    .from('supplier_orders').select('*, supplier_order_items(*)').eq('id', order.id).single();
  return NextResponse.json(full, { status: 201 });
}
