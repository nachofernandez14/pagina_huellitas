import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

// GET /api/admin/settings — returns current settings status from env vars
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const token = process.env.MP_ACCESS_TOKEN ?? null;
  return NextResponse.json({
    mp_access_token: token ? `${token.slice(0, 6)}${'*'.repeat(Math.max(0, token.length - 10))}${token.slice(-4)}` : null,
    mp_configured: !!token,
  });
}
