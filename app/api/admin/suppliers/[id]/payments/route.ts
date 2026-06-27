import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { id } = await params;
  const { monto, tipo, descripcion, fecha, comprobante } = await req.json();

  if (!monto || monto <= 0)
    return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });

  const { data, error } = await admin
    .from('supplier_payments')
    .insert({
      supplier_id: id,
      fecha: fecha || new Date().toISOString().split('T')[0],
      monto,
      tipo: tipo || 'pago',
      descripcion: descripcion || null,
      comprobante: comprobante || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
