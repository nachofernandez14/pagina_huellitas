/**
 * Utility para testing del webhook de Mercado Pago
 * 
 * USO EN DESARROLLO:
 * 1. Desde la consola Node o en un archivo test:
 *    import { testWebhook } from '@/lib/webhook-test'
 *    await testWebhook('123456789', 'your-order-id')
 * 
 * 2. O usa el comando:
 *    node -e "require('./lib/webhook-test').testWebhookCLI()"
 */

import { createHmac } from 'crypto';

interface WebhookTestOptions {
  paymentId: string;
  orderId: string;
  status?: 'approved' | 'pending' | 'rejected';
  baseUrl?: string;
}

/**
 * Simula un webhook de Mercado Pago
 * Útil para testing en desarrollo
 */
export async function testWebhook(
  paymentId: string,
  orderId: string,
  options?: {
    status?: 'approved' | 'pending' | 'rejected';
    baseUrl?: string;
  }
): Promise<void> {
  const secret = process.env.CLAVE_SECRETA;
  if (!secret) {
    console.error('❌ CLAVE_SECRETA no configurada');
    return;
  }

  const status = options?.status ?? 'approved';
  const baseUrl = options?.baseUrl ?? 'http://localhost:3000';

  // Generar timestamp y firma
  const ts = Math.floor(Date.now() / 1000).toString();
  const manifest = `${ts};${paymentId}`;
  const hash = createHmac('sha256', secret).update(manifest).digest('hex');

  const webhookUrl = `${baseUrl}/api/payments/webhook?data.id=${paymentId}`;
  const signature = `ts=${ts},v1=${hash}`;

  const payload = {
    type: 'payment',
    action: 'payment.created',
    data: { id: paymentId },
  };

  console.log('📤 Enviando webhook de prueba...');
  console.log('URL:', webhookUrl);
  console.log('Firma:', signature);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': signature,
        'x-request-id': `test-${Date.now()}`,
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    console.log('✓ Response Status:', response.status);
    console.log('✓ Response Body:', JSON.stringify(responseData, null, 2));

    if (response.ok) {
      console.log('✅ Webhook procesado correctamente');
    } else {
      console.warn('⚠️ Webhook retornó status no 2xx');
    }
  } catch (err) {
    console.error('❌ Error enviando webhook:', err);
  }
}

/**
 * CLI para testing desde la terminal
 * node -e "require('./dist/lib/webhook-test').testWebhookCLI()"
 */
export async function testWebhookCLI(): Promise<void> {
  const paymentId = process.argv[2] || `TEST-${Date.now()}`;
  const orderId = process.argv[3] || `order-${Date.now()}`;
  const status = (process.argv[4] as any) || 'approved';

  console.log('🧪 Testing Mercado Pago Webhook\n');
  console.log('Parámetros:');
  console.log(`  Payment ID: ${paymentId}`);
  console.log(`  Order ID: ${orderId}`);
  console.log(`  Status: ${status}\n`);

  await testWebhook(paymentId, orderId, { status });
}

/**
 * Genera una firma válida para testing
 */
export function generateValidSignature(
  paymentId: string,
  timestamp?: number
): { signature: string; timestamp: number } {
  const secret = process.env.CLAVE_SECRETA;
  if (!secret) {
    throw new Error('CLAVE_SECRETA no configurada');
  }

  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const manifest = `${ts};${paymentId}`;
  const hash = createHmac('sha256', secret).update(manifest).digest('hex');

  return {
    signature: `ts=${ts},v1=${hash}`,
    timestamp: ts,
  };
}

/**
 * Verifica si una firma es válida (útil para debugging)
 */
export function verifySignature(
  signature: string,
  paymentId: string
): { valid: boolean; reason?: string } {
  const secret = process.env.CLAVE_SECRETA;
  if (!secret) {
    return { valid: false, reason: 'CLAVE_SECRETA no configurada' };
  }

  const parts = Object.fromEntries(
    signature.split(',').map((p) => p.trim().split('=') as [string, string])
  );
  const ts = parts['ts'];
  const hash = parts['v1'];

  if (!ts || !hash) {
    return { valid: false, reason: 'Formato de firma inválido' };
  }

  const manifest = `${ts};${paymentId}`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');

  if (expected === hash) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: `Hash no coincide. Esperado: ${expected}, Recibido: ${hash}`,
  };
}
