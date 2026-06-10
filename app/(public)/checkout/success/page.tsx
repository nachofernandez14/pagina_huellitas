import Link from 'next/link';
import { redirect } from 'next/navigation';
import { markOrderPaid, cancelOrder } from '@/lib/orders';
import { verifyMPPayment } from '@/lib/mercadopago';
import { createClient } from '@/lib/supabase/server';
import CartClearer from './CartClearer';

interface Props {
  searchParams: Promise<{
    order?: string;
    status?: string;
    payment_id?: string;
    collection_id?: string;
    collection_status?: string;
    entrega?: string;
  }>;
}

const METODO_LABELS: Record<string, string> = {
  credit_card: 'Tarjeta de crédito',
  debit_card: 'Tarjeta de débito',
  account_money: 'Dinero en cuenta Mercado Pago',
  prepaid_card: 'Tarjeta prepaga',
  bank_transfer: 'Transferencia bancaria',
  ticket: 'Pago en efectivo',
  atm: 'Cajero automático',
};

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const params = await searchParams;

  const orderId = params.order;
  const paymentId = params.payment_id ?? params.collection_id;
  const status = params.status ?? params.collection_status;
  const isCash = status === 'cash';
  const isPending = status === 'pending';
  const isEnvio = params.entrega === 'envio';

  let metodoPago: string | null = null;
  let paymentConfirmed = false;

  // Verificar el pago con MP y marcar como pagado (fallback al webhook)
  if (paymentId && orderId && !isPending && !isCash) {
    let info: Awaited<ReturnType<typeof verifyMPPayment>> = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        info = await verifyMPPayment(paymentId);
        if (info) break;
      } catch {
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    if (info && info.status === 'approved' && info.orderId === orderId) {
      metodoPago = METODO_LABELS[info.paymentType] ?? info.paymentType ?? null;
      await markOrderPaid(orderId, paymentId, metodoPago ?? undefined);
      paymentConfirmed = true;
    } else if (info && info.status !== 'approved') {
      if (orderId) {
        try { await cancelOrder(orderId); } catch { /* silent */ }
      }
      redirect(`/checkout/failure?order=${orderId ?? ''}`);
    }
  }

  // Verificar si el usuario está logueado para mostrar "Mis pedidos"
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  // El carrito se limpia solo cuando el pago fue confirmado (MP aprobado o efectivo)
  const shouldClearCart = isCash || paymentConfirmed;

  return (
    <div className="section" style={{ textAlign: 'center' }}>
      {shouldClearCart && <CartClearer />}
      <div className="container" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          {isCash ? (
            // Store icon
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#805ad5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          ) : isPending ? (
            // Clock icon
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          ) : (
            // Check circle icon
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#38a169" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          )}
        </div>
        <h1 className="section-title" style={{ marginBottom: '0.75rem' }}>
          {isCash ? '¡Pedido confirmado!' : isPending ? 'Pago en revisión' : '¡Gracias por tu compra!'}
        </h1>
        <p className="text-gray" style={{ marginBottom: '0.5rem' }}>
          {isCash
            ? isEnvio
              ? 'Tu pedido fue registrado. Pasás el efectivo cuando te lo llevamos a tu casa.'
              : 'Tu pedido fue registrado. Pasá por el local a retirarlo y abonarlo en efectivo.'
            : isPending
            ? 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.'
            : 'Tu pedido fue recibido y lo estamos preparando.'}
        </p>
        {isCash && (
          <p className="text-gray" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            El estado de tu pedido aparece como <strong>pendiente</strong> hasta que se confirme el pago.
          </p>
        )}
        {orderId && (
          <p className="text-gray" style={{ fontSize: '0.875rem', marginBottom: metodoPago ? '0.5rem' : '2rem' }}>
            Número de pedido: <strong>{orderId}</strong>
          </p>
        )}
        {metodoPago && (
          <p className="text-gray" style={{ fontSize: '0.875rem', marginBottom: '2rem' }}>
            Método de pago: <strong>{metodoPago}</strong>
          </p>
        )}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/productos" className="btn btn-primary">
            Seguir comprando
          </Link>
          {isLoggedIn && (
            <Link href="/perfil" className="btn btn-outline">
              Mis pedidos
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

