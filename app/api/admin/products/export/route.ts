import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { requireAdmin } from '@/lib/auth';
import type { Product } from '@/types';

const FIELDS = [
  'id',
  'slug',
  'nombre',
  'categoria',
  'subcategoria',
  'kg',
  'precio',
  'precio_final',
  'precio_local',
  'precio_costo',
  'descuento',
  'en_oferta',
  'promo_label',
  'proteina',
  'kg_regalo',
  'stock',
  'activo',
  'imagen',
] as const;

// GET /api/admin/products/export — downloads all products as CSV
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  // Fetch in pages to avoid limits on large catalogs
  const products: Product[] = [];
  const PAGE = 500;
  let offset = 0;
  for (;;) {
    const { data, error } = await admin
      .from('products')
      .select('*')
      .order('nombre')
      .range(offset, offset + PAGE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) break;
    products.push(...(data as Product[]));
    if (data.length < PAGE) break;
    offset += PAGE;
  }

  const csv = Papa.unparse(
    {
      fields: [...FIELDS],
      data: products.map((p) => {
        const hasValidDiscount =
          p.descuento != null && p.descuento > 0 && p.descuento < (p.precio ?? Infinity);
        return [
          p.id,
          p.slug ?? '',
          p.nombre,
          p.categoria,
          p.subcategoria ?? '',
          p.kg ?? '',
          p.precio ?? '',
          hasValidDiscount ? p.descuento : p.precio ?? '',
          p.precio_local ?? '',
          p.precio_costo ?? '',
          p.descuento ?? '',
          hasValidDiscount ? 'si' : '',
          p.promo_label ?? '',
          p.proteina ?? '',
          p.kg_regalo ?? '',
          p.stock,
          p.activo ? 'si' : 'no',
          p.imagen ?? '',
        ];
      }),
    },
    { quotes: true, delimiter: ',' }
  );

  // BOM so Excel/Sheets render accents (á, é, ñ) correctly
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse('\uFEFF' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="productos_${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
