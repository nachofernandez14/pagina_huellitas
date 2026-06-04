import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single();
  return profile?.rol === 'admin' ? user : null;
}

// POST /api/admin/settings/test-mp — validates an MP access token
export async function POST(req: NextRequest) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { token } = await req.json() as { token: string };
  if (!token?.trim()) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
  }

  try {
    const res = await fetch('https://api.mercadopago.com/users/me', {
      headers: { Authorization: `Bearer ${token.trim()}` },
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: 'Token inválido o sin permisos' });
    }
    const data = await res.json() as { email?: string; site_id?: string; id?: number };
    return NextResponse.json({
      ok: true,
      email: data.email,
      site_id: data.site_id,
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'No se pudo conectar con MercadoPago' });
  }
}
