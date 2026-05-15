import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single();
  if (!profile || profile.rol !== 'admin') return null;
  return user;
}

// PATCH /api/products/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  if (!await requireAdmin(supabase))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const allowedFields = ['nombre', 'categoria', 'subcategoria', 'precio', 'precio_original',
    'descuento', 'kg', 'stock', 'activo', 'imagen', 'supplier_id', 'precio_costo', 'proteina', 'variantes', 'kg_regalo'];
  const update: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) update[key] = body[key];
  }
  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('products').update(update).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/products/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  if (!await requireAdmin(supabase))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();
  const { error } = await admin.from('products').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

