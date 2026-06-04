import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { code, total } = await req.json() as { code: string; total: number };

    if (!code?.trim()) {
      return NextResponse.json({ valid: false, message: 'Código requerido' });
    }

    const supabase = await createClient();

    // Auth required — guests can't have promo codes
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ valid: false, message: 'Debés iniciar sesión para usar un cupón' });
    }

    const { data, error } = await supabase
      .from('promo_codes')
      .select('code, discount, min_order, used, email')
      .eq('code', code.trim().toUpperCase())
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ valid: false, message: 'Código inválido' });
    }
    if (data.used) {
      return NextResponse.json({ valid: false, message: 'Este código ya fue utilizado' });
    }
    // Ownership check — code must belong to the logged-in user
    if (data.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ valid: false, message: 'Código inválido' });
    }
    if (typeof total === 'number' && total < data.min_order) {
      const fmt = new Intl.NumberFormat('es-AR', {
        style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
      }).format(data.min_order);
      return NextResponse.json({
        valid: false,
        message: `El código es válido en compras mayores a ${fmt}`,
      });
    }

    return NextResponse.json({ valid: true, discount: data.discount, code: data.code });
  } catch {
    return NextResponse.json({ valid: false, message: 'Error al validar el código' });
  }
}
