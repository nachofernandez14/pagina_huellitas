import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

// GET /api/admin/expense-categories — admin only
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const { data, error } = await admin
    .from('expense_categories')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
