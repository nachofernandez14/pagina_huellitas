import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

// POST /api/admin/settings/test-mp — validates an MP access token
export async function POST(req: NextRequest) {
  const supabase = await requireAdmin();
  if (!supabase) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

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
