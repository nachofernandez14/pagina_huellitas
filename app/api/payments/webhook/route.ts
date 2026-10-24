import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { markOrderPaid, recordPaymentStatus } from '@/lib/orders';
import { verifyMPPayment } from '@/lib/mercadopago';
import { recordOrderEvent } from '@/lib/evidence';

const isDev = process.env.NODE_ENV === 'development';
const skipSignatureVerification = isDev && process.env.MP_IGNORE_SIGNATURE === 'true';
const allowTestWebhooks = isDev && process.env.MP_IGNORE_PAYMENT_VERIFICATION === 'true';

/** MP payment statuses mirrored into orders.payment_status (DB check constraint). */
const PAYMENT_STATUSES = new Set([
  'pending', 'in_process', 'approved', 'rejected', 'cancelled', 'refunded', 'charged_back', 'cash_pending',
]);
const MP_STATUS_MAP: Record<string, string> = { authorized: 'in_process' };

/**
 * Verifica la firma del webhook de Mercado Pago
 * Mercado Pago envía: x-signature = "ts=timestamp,v1=hash"
 * El hash se calcula sobre id, request-id y ts según el formato de MP.
 */
function verifyMPSignature(req: NextRequest, rawBody?: string): boolean {
  if (skipSignatureVerification) {
    console.warn('[webhook] Saltando verificación de firma porque MP_IGNORE_SIGNATURE=true');
    return true;
  }

  const secret = process.env.MP_WEBHOOK_SECRET ?? process.env.CLAVE_SECRETA;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[webhook] MP_WEBHOOK_SECRET no configurada — rechazando webhook');
      return false;
    }
    console.warn('[webhook] MP_WEBHOOK_SECRET no configurada, omitiendo verificación de firma (solo dev)');
    return true;
  }

  const xSignature = req.headers.get('x-signature');
  const requestId = req.headers.get('x-request-id');
  const dataIdQuery = new URL(req.url).searchParams.get('data.id');
  let dataIdBody: string | undefined;

  if (!xSignature) {
    console.error('[webhook] No x-signature header found');
    return false;
  }

  // Parse x-signature: "ts=123456,v1=abcdef"
  const parts = Object.fromEntries(
    xSignature.split(',').map((p) => p.trim().split('=') as [string, string])
  );
  const ts = parts['ts'];
  const hash = parts['v1'];
  
  if (!ts || !hash || !requestId) {
    console.error('[webhook] Invalid signature headers', {
      ts: !!ts,
      hash: !!hash,
      requestId: !!requestId,
    });
    return false;
  }

  if (!dataIdQuery && rawBody) {
    try {
      const parsed = JSON.parse(rawBody);
      dataIdBody = parsed?.data?.id;
    } catch {
      dataIdBody = undefined;
    }
  }

  const dataId = (dataIdQuery ?? dataIdBody)?.toLowerCase();
  if (!dataId) {
    console.error('[webhook] Payment ID missing from signature manifest');
    return false;
  }

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest();
  const received = Buffer.from(hash ?? '', 'hex');
  const isValid = received.length === expected.length && timingSafeEqual(received, expected);
  if (!isValid) {
    console.error('[webhook] Signature verification failed');
  }
  
  return isValid;
}

/**
 * Webhook de Mercado Pago
 * 
 * Flujo:
 * 1. Cliente paga en Mercado Pago
 * 2. Mercado Pago envía notificación al webhook con el payment ID
 * 3. Backend verifica la firma del webhook
 * 4. Backend consulta la API de Mercado Pago con el payment ID
 * 5. Si el pago está aprobado, marca la orden como PAGADA
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Parsear el body y verificar la firma del webhook
    let body: { type?: string; action?: string; data?: { id?: string } };
    let rawBody: string;
    try {
      rawBody = await req.text();
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error('[webhook] JSON parse error', e);
      return NextResponse.json(
        { error: 'Invalid JSON', received: true },
        { status: 400 }
      );
    }

    if (!verifyMPSignature(req, rawBody)) {
      console.error('[webhook] Firma inválida');
      return NextResponse.json(
        { error: 'Invalid signature', received: true },
        { status: 401 }
      );
    }

    const { type, action, data } = body;
    console.log('[webhook] Notificación recibida', { type, action });

    // 3. Solo procesar notificaciones de pagos
    if (type !== 'payment') {
      console.log('[webhook] Tipo de notificación no es payment, ignorando', { type });
      return NextResponse.json({ received: true });
    }

    // 4. Extraer el payment ID
    const paymentId = data?.id as string | undefined;
    if (!paymentId) {
      console.error('[webhook] Payment ID faltante');
      return NextResponse.json(
        { error: 'Missing payment id', received: true },
        { status: 400 }
      );
    }

    console.log('[webhook] Procesando payment ID:', paymentId);

    // 5. Verificar el pago con la API de Mercado Pago
    const paymentData = await verifyMPPayment(paymentId);
    
    if (!paymentData) {
      console.error('[webhook] No se pudo verificar el pago con MP', paymentId);
      if (allowTestWebhooks) {
        console.warn('[webhook] Ignorando verificación de pago de MP porque MP_IGNORE_PAYMENT_VERIFICATION=true');
        return NextResponse.json(
          { received: true, simulated: true },
          { status: 200 }
        );
      }
      return NextResponse.json(
        { error: 'Payment verification failed', received: true },
        { status: 400 }
      );
    }

    const { status, orderId, paymentType, paymentMethodId, amount, currency } = paymentData;
    console.log('[webhook] Datos del pago obtenidos', {
      paymentId,
      status,
      orderId,
      paymentType,
      paymentMethodId,
    });

    // Evidence trail: record every payment notification tied to the order.
    await recordOrderEvent(orderId, 'payment_notification', {
      source: 'webhook',
      detail: { paymentId, status, paymentType, paymentMethodId, amount },
    });

    // 6. Si el pago está aprobado, actualizar la orden
    if (status === 'approved') {
      if (!orderId) {
        console.error('[webhook] Pago aprobado pero sin external_reference (orderId)');
        return NextResponse.json(
          { error: 'No order ID in payment', received: true },
          { status: 400 }
        );
      }

      // Never store MP's payment_type_id (e.g. `account_money`) in the
      // constrained orders.forma_pago column. That detail is already retained
      // in the payment notification event.
      const result = await markOrderPaid(orderId, paymentId, 'Mercado Pago', { amount, currency });

      if (result.duplicate) {
        console.log('[webhook] Notificación duplicada ignorada', { orderId, paymentId });
        return NextResponse.json({ received: true, status: 'duplicate', orderId, paymentId });
      }

      console.log('[webhook] ✓ Orden procesada', {
        orderId,
        paymentId,
        paymentType,
        applied: result.applied,
      });

      return NextResponse.json({
        received: true,
        status: 'processed',
        orderId,
        paymentId,
        amountMismatch: !result.applied,
      });
    }

    // 7. Resto de estados — se registran en la orden sin sobrescribir un pago
    //    ya verificado. Rechazado/cancelado cancela el pedido pendiente.
    const normalized = MP_STATUS_MAP[status] ?? status;
    if (PAYMENT_STATUSES.has(normalized)) {
      await recordPaymentStatus(orderId, paymentId, normalized, { paymentType });
      if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(normalized)) {
        console.log('[webhook] ✓ Orden cancelada por estado de pago', { status: normalized, orderId, paymentId });
        return NextResponse.json({ received: true, status: 'cancelled', paymentStatus: normalized, orderId: orderId || null });
      }
    } else {
      // Unknown MP status — keep the evidence, don't touch the order state.
      await recordOrderEvent(orderId, `payment_status_unmapped_${status || 'empty'}`, {
        source: 'webhook',
        detail: { paymentId },
      });
    }

    console.log('[webhook] Pago en estado:', status, 'No se toma acción automática');
    return NextResponse.json({
      received: true,
      status: 'acknowledged',
      paymentStatus: status,
      orderId: orderId || null,
    });

  } catch (err) {
    console.error('[webhook] Error procesando notificación:', err);
    return NextResponse.json(
      { error: 'Internal error', received: true },
      { status: 500 }
    );
  }
}
