import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/products/suggest?q=sieger — returns up to 6 matching product names
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json({ suggestions: [] });

  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('nombre')
    .eq('activo', true)
    .ilike('nombre', `%${q}%`)
    .order('nombre', { ascending: true })
    .limit(20);

  // Deduplicate: products with variants share the same nombre
  const seen = new Set<string>();
  const suggestions: string[] = [];
  for (const row of data ?? []) {
    if (!seen.has(row.nombre)) {
      seen.add(row.nombre);
      suggestions.push(row.nombre);
    }
    if (suggestions.length >= 6) break;
  }

  return NextResponse.json({ suggestions });
}
