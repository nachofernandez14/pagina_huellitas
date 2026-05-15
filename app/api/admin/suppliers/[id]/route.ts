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

// GET /api/admin/suppliers/[id] — supplier detail
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [supplier, orders, payments, products] = await Promise.all([
    admin.from('suppliers').select('*').eq('id', id).single(),
    admin.from('supplier_orders')
      .select('*, supplier_order_items(*)')
      .eq('supplier_id', id)
      .order('fecha', { ascending: false }),
    admin.from('supplier_payments')
      .select('*')
      .eq('supplier_id', id)
      .order('fecha', { ascending: false }),
    admin.from('products')
      .select('id, nombre, kg, precio_costo')
      .eq('supplier_id', id)
      .eq('activo', true)
      .order('nombre'),
  ]);

  if (supplier.error) return NextResponse.json({ error: supplier.error.message }, { status: 404 });
  return NextResponse.json({
    supplier: supplier.data,
    orders: orders.data ?? [],
    payments: payments.data ?? [],
    products: products.data ?? [],
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const { data, error } = await admin.from('suppliers').update(body).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { error } = await admin.from('suppliers').update({ activo: false }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
