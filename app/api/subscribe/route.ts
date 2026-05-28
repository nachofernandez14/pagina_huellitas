import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPromoCodeEmail } from '@/lib/email';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(): string {
  let code = 'HUE-';
  for (let i = 0; i < 8; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: max 3 attempts per IP per hour
    const ip = getClientIp(request);
    const rl = checkRateLimit(`subscribe:${ip}`, 3, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intentá más tarde.' },
        { status: 429 }
      );
    }

    const supabase = await createClient();

    // Auth required — email comes from the verified session, never from the client body
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json(
        { error: 'Debés iniciar sesión para solicitar el cupón' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { petName, petType, breed, age } = body;

    if (!petType) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Always use the verified session email — ignore any email in the body
    const emailNorm = user.email.trim().toLowerCase();

    // Save subscriber (ignore duplicate errors)
    await supabase.from('pet_subscribers').insert({
      email: emailNorm,
      pet_name: petName?.trim() || null,
      pet_type: petType,
      breed: breed?.trim() || null,
      age: age ? parseInt(age, 10) : null,
    });

    // Check if this email already has a promo code
    const { data: existing } = await supabase
      .from('promo_codes')
      .select('code, used')
      .eq('email', emailNorm)
      .maybeSingle();

    if (existing) {
      // Code already exists — don't resend (user already received it on first request)
      // Just return ok silently so the client can mark itself as submitted
    } else {
      // Generate a unique code (retry on collision)
      let code = '';
      for (let attempt = 0; attempt < 5; attempt++) {
        code = generateCode();
        const { error: insertError } = await supabase
          .from('promo_codes')
          .insert({ code, email: emailNorm, discount: 5000, min_order: 80000 });
        if (!insertError) break;
      }
      if (code) {
        await sendPromoCodeEmail(emailNorm, code).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
