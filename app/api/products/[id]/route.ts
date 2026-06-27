import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getCurrentUserId } from '@/lib/auth';
import { auditLog } from '@/lib/audit';
import { generateProductSlug } from '@/lib/slug';
import { revalidateTag } from 'next/cache';

// PATCH /api/products/[id]  — update a product (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  if (body.nombre !== undefined) {
    body.slug = generateProductSlug(body.nombre, body.kg);
  }

  const { data, error } = await admin
    .from('products')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateTag('products', 'max');

  auditLog({
    user_id: await getCurrentUserId(),
    action: 'product.update',
    entity_type: 'products',
    entity_id: id,
    details: { changes: Object.keys(body) },
  });

  return NextResponse.json(data);
}

// DELETE /api/products/[id]  — delete a product (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { id } = await params;

  const { error } = await admin
    .from('products')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateTag('products', 'max');

  auditLog({
    user_id: await getCurrentUserId(),
    action: 'product.delete',
    entity_type: 'products',
    entity_id: id,
    details: null,
  });

  return new NextResponse(null, { status: 204 });
}
