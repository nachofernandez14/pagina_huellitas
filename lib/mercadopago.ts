import MercadoPagoConfig, { Preference } from 'mercadopago';
import type { CartItem } from '@/types';

export async function getMPAccessToken(): Promise<string> {
  const envToken = process.env.MP_ACCESS_TOKEN;
  if (envToken) return envToken;

  throw new Error(
    'MercadoPago no configurado. Definí la variable de entorno MP_ACCESS_TOKEN.'
  );
}

export interface CreatePreferenceInput {
  items: CartItem[];
  orderId: string;
  siteUrl: string;
  discount?: number;
}

export async function createMercadoPagoPreference(
  input: CreatePreferenceInput
): Promise<{ id: string; init_point: string }> {
  const { items, orderId, siteUrl, discount } = input;
  const token = await getMPAccessToken();
  const client = new MercadoPagoConfig({ accessToken: token });
  const preference = new Preference(client);

  const isSandbox = token.startsWith('TEST-');
  const isLocalhost = siteUrl.includes('localhost') || siteUrl.includes('127.0.0.1');

  // If a promo discount is applied, use a single consolidated item so the
  // MP total matches the discounted amount exactly (MP doesn't allow negative prices).
  let mpItems: {
    id?: string; title: string; quantity: number; unit_price: number;
    currency_id: string; picture_url?: string;
  }[];

  if (discount && discount > 0) {
    const originalTotal = items.reduce((s, i) => s + Number(i.precio) * i.quantity, 0);
    const finalTotal = Math.max(0, originalTotal - discount);
    mpItems = [{
      title: 'Compra en Huellitas Petshop',
      quantity: 1,
      unit_price: finalTotal,
      currency_id: 'ARS',
    }];
  } else {
    mpItems = items.map((item) => ({
      id: item.id,
      title: item.nombre,
      quantity: item.quantity,
      unit_price: Number(item.precio),
      currency_id: 'ARS',
      ...(item.imagen && !isLocalhost
        ? { picture_url: item.imagen.startsWith('http') ? item.imagen : `${siteUrl}/images/${item.imagen}` }
        : {}),
    }));
  }

  const result = await preference.create({
    body: {
      items: mpItems,
      back_urls: {
        success: `${siteUrl}/checkout/success?order=${orderId}`,
        failure: `${siteUrl}/checkout/failure?order=${orderId}`,
        pending: `${siteUrl}/checkout/success?order=${orderId}&status=pending`,
      },
      ...(isLocalhost ? {} : { auto_return: 'approved' as const }),
      external_reference: orderId,
      ...(isLocalhost ? {} : { notification_url: `${siteUrl}/api/payments/webhook` }),
      payment_methods: {
        installments: 1, // Sin cuotas — pago en un solo cobro
      },
    },
  });

  if (!result.id) {
    throw new Error('Error al crear la preferencia de pago');
  }

  // Para sandbox se usa sandbox_init_point para que el botón "Pagar" funcione correctamente
  const initPoint = (isSandbox && result.sandbox_init_point)
    ? result.sandbox_init_point
    : result.init_point;

  if (!initPoint) {
    throw new Error('Error al crear la preferencia de pago');
  }

  return { id: result.id, init_point: initPoint };
}

/** Verifica un pago con la API de MP y retorna datos relevantes o null si no es válido */
export async function verifyMPPayment(paymentId: string): Promise<{
  status: string;
  orderId: string;
  paymentType: string;
  paymentMethodId: string;
} | null> {
  try {
    const token = await getMPAccessToken();
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const p = await res.json();
    return {
      status: p.status ?? '',
      orderId: p.external_reference ?? '',
      paymentType: p.payment_type_id ?? '',
      paymentMethodId: p.payment_method_id ?? '',
    };
  } catch {
    return null;
  }
}
