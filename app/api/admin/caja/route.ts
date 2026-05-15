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

// GET /api/admin/caja — list entries, newest first (optional ?year=YYYY)
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const year = req.nextUrl.searchParams.get('year');
  let query = admin
    .from('caja_diaria')
    .select('*')
    .order('fecha', { ascending: false });

  if (year) {
    query = query
      .gte('fecha', `${year}-01-01`)
      .lte('fecha', `${year}-12-31`);
  }

  const { data, error } = await query.limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/admin/caja — create entry
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { fecha, saldo_inicial, ventas_efectivo, ventas_mercadopago, ventas_tarjeta, ventas_transferencia, notas } = body;

  if (!fecha) return NextResponse.json({ error: 'fecha requerida' }, { status: 400 });

  const { data, error } = await admin
    .from('caja_diaria')
    .upsert({
      fecha,
      saldo_inicial: saldo_inicial ?? 0,
      ventas_efectivo: ventas_efectivo ?? 0,
      ventas_mercadopago: ventas_mercadopago ?? 0,
      ventas_tarjeta: ventas_tarjeta ?? 0,
      ventas_transferencia: ventas_transferencia ?? 0,
      notas: notas || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'fecha' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
