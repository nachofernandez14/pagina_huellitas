import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidateTag } from 'next/cache';
import type { Product } from '@/types';

// GET /api/products?categoria=perros&q=agility&limit=50&offset=0&activo=all
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const categoria = searchParams.get('categoria') ?? undefined;
  const q = searchParams.get('q') ?? undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 1000);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const wantsAll = searchParams.get('activo') === 'all';

  const supabase = await createClient();

  // Only admins can query inactive products
  let all = false;
  if (wantsAll) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).single();
      if (profile?.rol === 'admin') all = true;
    }
  }
  let query = supabase
    .from('products')
    .select('*')
    .order('nombre')
    .range(offset, offset + limit - 1);

  if (!all) query = query.eq('activo', true);
  if (categoria) query = query.eq('categoria', categoria);
  if (q) query = query.ilike('nombre', `%${q}%`);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// POST /api/products  — admin only; used by import script
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single();
  if (!profile || profile.rol !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const admin = createAdminClient();

  // Single product creation from admin UI
  if (!Array.isArray(body)) {
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
  const products: Partial<Product>[] = body;
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
