import { NextResponse } from 'next/server';
import { requireAdmin, getCurrentUserId } from '@/lib/auth';
import { auditLog } from '@/lib/audit';
import { createAdminClient } from '@/lib/supabase/admin';
import { searchPaymentsByExternalReference } from '@/lib/mercadopago';
import { markOrderPaid } from '@/lib/orders';
import { recordOrderEvent } from '@/lib/evidence';

/**
 * POST /api/admin/orders/reconcile
 *
 * Reconciliation sweep: web Mercado Pago orders that have been pending for a
 * while get checked directly against MP's API by external_reference. This
 * catches payments MP approved while the webhook was missed or the buyer never
 * returned to the success page — the usual cause of `mp_payment_id = null`.
 */
export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const db = createAdminClient();
  const staleCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { data: candidates, error } = await db
    .from('orders')
    .select('id, total, created_at')
    .eq('canal', 'web')
    .eq('estado', 'pending')
    .neq('forma_pago', 'efectivo')
    .neq('payment_status', 'approved')
    .lt('created_at', staleCutoff)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: { orderId: string; result: string }[] = [];

  for (const order of candidates ?? []) {
    const payments = await searchPaymentsByExternalReference(order.id);
    const approved = payments.find((p) => p.status === 'approved' && p.id);

    if (approved) {
      try {
        const res = await markOrderPaid(order.id, approved.id, undefined, { amount: approved.amount });
        results.push({ orderId: order.id, result: res.applied ? 'paid' : res.duplicate ? 'already-paid' : 'amount-mismatch' });
      } catch (err) {
        results.push({ orderId: order.id, result: 'error' });
        await recordOrderEvent(order.id, 'reconcile_error', {
          source: 'admin',
          detail: { paymentId: approved.id, error: err instanceof Error ? err.message : 'unknown' },
        });
      }
    } else if (payments.length > 0) {
      // Payments exist but none approved — record for visibility.
      await recordOrderEvent(order.id, 'reconcile_no_approval', {
        source: 'admin',
        detail: { statuses: payments.map((p) => p.status) },
      });
      results.push({ orderId: order.id, result: 'no-approval' });
    } else {
      await recordOrderEvent(order.id, 'reconcile_no_payment', { source: 'admin' });
      results.push({ orderId: order.id, result: 'no-payment' });
    }
  }

  auditLog({
    user_id: await getCurrentUserId(),
    action: 'orders.reconcile',
    entity_type: 'orders',
    entity_id: null,
    details: { checked: results.length },
  });

  return NextResponse.json({ checked: results.length, results });
}
