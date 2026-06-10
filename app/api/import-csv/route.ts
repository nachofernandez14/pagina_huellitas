import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { parseAllProducts } from '@/lib/csv-parser';
import { revalidateTag } from 'next/cache';

// POST /api/import-csv — admin only, imports products from CSV files
export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  try {
    const csvDir = process.cwd();
    const products = parseAllProducts(csvDir);

    if (products.length === 0) {
      return NextResponse.json({ error: 'No products found in CSV files' }, { status: 400 });
    }

    const { data, error } = await admin
      .from('products')
      .upsert(products, { onConflict: 'nombre,kg' })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidateTag('products', 'max');
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
