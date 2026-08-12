import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { generateProductSlug } from '@/lib/slug';
import { revalidateTag } from 'next/cache';
import type { Product } from '@/types';

// GET /api/products?categoria=perros&q=agility&limit=50&offset=0&activo=all
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const categoria = searchParams.get('categoria') ?? undefined;
  const q = searchParams.get('q') ?? undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 1000);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  let query = admin
    .from('products')
    .select('*', { count: 'exact' })
    .order('nombre')
    .range(offset, offset + limit - 1);

  if (categoria) query = query.eq('categoria', categoria);
  if (q) {
    const pattern = `%${q}%`;
    query = query.or(`nombre.ilike.${pattern},kg.ilike.${pattern}`);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data, total: count ?? 0 });
}

// POST /api/products  — admin only; used by import script
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const body = await req.json();

  // Single product creation from admin UI
  if (!Array.isArray(body)) {
    body.slug = generateProductSlug(body.nombre, body.kg);
    const { data, error } = await admin
      .from('products')
      .insert(body)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidateTag('products', 'max');
    return NextResponse.json(data, { status: 201 });
  }

  // Bulk upsert (CSV import)
  const products: Partial<Product>[] = body.map((p: Partial<Product>) => ({
    ...p,
    slug: generateProductSlug(p.nombre || '', p.kg),
  }));
  const { data, error } = await admin
    .from('products')
    .upsert(products, { onConflict: 'nombre,kg' })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  revalidateTag('products', 'max');
  return NextResponse.json({ inserted: data?.length ?? 0 });
}
