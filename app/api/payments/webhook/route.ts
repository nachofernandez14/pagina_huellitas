import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { markOrderPaid } from '@/lib/orders';

function verifyMPSignature(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  // Si no está configurado el secret, omitir verificación (dev/sandbox)
  if (!secret) return true;

  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id');
  const dataId = new URL(req.url).searchParams.get('data.id');

  if (!xSignature) return false;

  const parts = Object.fromEntries(
    xSignature.split(',').map((p) => p.trim().split('=') as [string, string])
  );
  const ts = parts['ts'];
  const hash = parts['v1'];
  if (!ts || !hash) return false;

  const manifest = `id:${dataId ?? ''};request-id:${xRequestId ?? ''};ts:${ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');
  return expected === hash;
}

// Mercado Pago sends IPN/webhook to this endpoint
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifyMPSignature(req, rawBody)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: { type?: string; data?: { id?: string } };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, data } = body;

  // Only handle payment notifications
  if (type !== 'payment') {
    return NextResponse.json({ received: true });
  }

  const paymentId = data?.id as string | undefined;
  if (!paymentId) {
    return NextResponse.json({ error: 'Missing payment id' }, { status: 400 });
  }

  try {
    // Verify payment with Mercado Pago API
    const mpToken = process.env.MP_ACCESS_TOKEN;
    if (!mpToken) {
      return NextResponse.json({ error: 'MP not configured' }, { status: 500 });
    }

    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
      {
        headers: {
          Authorization: `Bearer ${mpToken}`,
        },
      }
    );

    if (!mpRes.ok) {
      console.error('[webhook] Failed to verify payment', paymentId);
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }

    const payment = await mpRes.json();
    const { status, external_reference: orderId, payment_type_id: paymentType } = payment;

    if (status === 'approved' && orderId) {
      await markOrderPaid(orderId, paymentId, paymentType ?? undefined);
      console.log(`[webhook] Order ${orderId} marked as paid (${paymentType})`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[webhook] Error processing notification', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
