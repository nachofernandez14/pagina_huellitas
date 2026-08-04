import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PASS_MAX = 128;

// POST /api/auth/recovery/update-password — updates the password for the session
// established server-side, then signs out so the user logs in fresh.
export async function POST(req: NextRequest) {
  const { password } = await req.json() as { password?: string };

  if (!password || password.length < 8 || password.length > PASS_MAX) {
    return NextResponse.json(
      { error: 'La contraseña debe tener entre 8 y 128 caracteres' },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sesión de recuperación inválida.' }, { status: 401 });
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  // Sign out so the user logs in fresh with the new password
  await supabase.auth.signOut().catch(() => {});

  return NextResponse.json({ ok: true });
}