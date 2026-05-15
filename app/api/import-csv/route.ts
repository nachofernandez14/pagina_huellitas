import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { parseAllProducts } from '@/lib/csv-parser';

// POST /api/import-csv — admin only, imports products from CSV files
export async function POST() {
  // Verificar que el usuario autenticado sea admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single();
  if (!profile || profile.rol !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const csvDir = process.cwd(); // CSVs are in the project root
    const products = parseAllProducts(csvDir);

    if (products.length === 0) {
      return NextResponse.json({ error: 'No products found in CSV files' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('products')
      .upsert(products, { onConflict: 'nombre,kg' })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Import successful',
      count: data?.length ?? 0,
      total_parsed: products.length,
    });
  } catch (err) {
    console.error('[import-csv]', err);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
