import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

// GET /api/admin/expenses?from=&to=&category_id=
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const catId = searchParams.get('category_id');

  let query = admin
    .from('expenses')
    .select('*, expense_categories(nombre)')
    .order('fecha', { ascending: false });
  if (from) query = query.gte('fecha', from);
  if (to) query = query.lte('fecha', to);
  if (catId) query = query.eq('category_id', catId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/expenses
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const { descripcion, monto, fecha, category_id, notas } = body;
  if (!descripcion || !monto || !fecha)
    return NextResponse.json({ error: 'descripcion, monto y fecha son requeridos' }, { status: 400 });
  const { data, error } = await admin
    .from('expenses')
    .insert({ descripcion, monto, fecha, category_id: category_id || null, notas: notas || null })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
