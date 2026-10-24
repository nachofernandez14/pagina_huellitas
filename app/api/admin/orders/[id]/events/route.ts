import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/admin/orders/[id]/events — private evidence trail for one order.
// Returns technical events (IP, user-agent, payment lifecycle) so suspicious
// orders can be investigated. Admin-only.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { id } = await params;

  const { data, error } = await createAdminClient()
    .from('order_events')
    .select('id, event, source, ip, user_agent, detail, created_at')
    .eq('order_id', id)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
