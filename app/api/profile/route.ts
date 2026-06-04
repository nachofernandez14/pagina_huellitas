import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PUT /api/profile — update authenticated user's profile fields
export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json() as { nombre?: string; telefono?: string; direccion?: string; zona?: string };

  const VALID_ZONAS = ['rodeo', 'corralitos', 'km8', 'primavera'];

  // Only allow safe fields — never expose rol or id updates from this endpoint
  const update: Record<string, string | null> = {};
  if (typeof body.nombre === 'string')    update.nombre    = body.nombre.trim().slice(0, 100);
  if (typeof body.telefono === 'string')  update.telefono  = body.telefono.replace(/\D/g, '').slice(0, 10);
  if (typeof body.direccion === 'string') update.direccion = body.direccion.trim().slice(0, 200);
  if (typeof body.zona === 'string') {
    update.zona = VALID_ZONAS.includes(body.zona) ? body.zona : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Sin datos para actualizar' }, { status: 400 });
  }

  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
