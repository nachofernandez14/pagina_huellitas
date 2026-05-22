import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { petName, email, petType, breed, age } = body;

    if (!email || !petType) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase.from('pet_subscribers').insert({
      email: email.trim().toLowerCase(),
      pet_name: petName?.trim() || null,
      pet_type: petType,
      breed: breed?.trim() || null,
      age: age ? parseInt(age, 10) : null,
    });

    // Si la tabla no existe todavía, ignoramos el error de DB silenciosamente
    if (error && !error.message.includes('does not exist')) {
      console.error('Subscribe error:', error);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
