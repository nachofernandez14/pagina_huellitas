import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

const ALLOWED_FIELDS = ['forma_pago', 'notas', 'guest_nombre'] as const;

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
    .select('id, canal, estado')
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
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No hay campos válidos para actualizar' }, { status: 400 });
  }

  const { data, error } = await admin
    .from('orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
