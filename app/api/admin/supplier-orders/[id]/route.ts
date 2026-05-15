import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles').select('rol').eq('id', user.id).single();
  if (!profile || profile.rol !== 'admin') return null;
  return createAdminClient();
}

// PATCH /api/admin/supplier-orders/[id] — update estado
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { estado } = await req.json();
  const allowed = ['pendiente', 'recibido_parcial', 'recibido', 'cancelado'];
  if (!allowed.includes(estado))
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
  const { data, error } = await admin
    .from('supplier_orders').update({ estado }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
