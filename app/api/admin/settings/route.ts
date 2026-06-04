import { NextResponse } from 'next/server';
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

// GET /api/admin/settings — returns current settings status from env vars
export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const token = process.env.MP_ACCESS_TOKEN ?? null;
  return NextResponse.json({
    mp_access_token: token ? `${token.slice(0, 6)}${'*'.repeat(Math.max(0, token.length - 10))}${token.slice(-4)}` : null,
    mp_configured: !!token,
  });
}
