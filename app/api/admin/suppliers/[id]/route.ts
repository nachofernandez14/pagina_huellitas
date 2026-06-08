import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { id } = await params;

  const { data: supplier, error: supplierErr } = await admin
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .single();

  if (supplierErr || !supplier)
    return NextResponse.json({ error: 'Proveedor no encontrado' }, { status: 404 });

  const { data: orders } = await admin
    .from('supplier_orders')
    .select('*, supplier_order_items(*)')
    .eq('supplier_id', id)
    .order('fecha', { ascending: false });

  const { data: payments } = await admin
    .from('supplier_payments')
    .select('*')
    .eq('supplier_id', id)
    .order('fecha', { ascending: false });

  const { data: products } = await admin
    .from('products')
    .select('id, nombre, kg, precio_costo')
    .eq('supplier_id', id)
    .eq('activo', true)
    .order('nombre');

  return NextResponse.json({ supplier, orders: orders ?? [], payments: payments ?? [], products: products ?? [] });
}
