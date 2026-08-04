import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/auth/recovery/session — establishes the (httpOnly) session server-side
// from the recovery tokens exchanged on the client. The browser client cannot
// write the httpOnly cookie, so we do it here instead.
export async function POST(req: NextRequest) {
  const { accessToken, refreshToken } = await req.json() as {
    accessToken?: string;
    refreshToken?: string;
  };

  if (!accessToken) {
    return NextResponse.json({ error: 'Link inválido o expirado.' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken ?? '',
  });

  if (error) {
    return NextResponse.json({ error: 'Link inválido o expirado.' }, { status: 400 });
  }

  // Confirm a valid user was actually established before declaring success
  if (!data.session) {
    return NextResponse.json({ error: 'Link inválido o expirado.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}