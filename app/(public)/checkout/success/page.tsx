import Link from 'next/link';
import { markOrderPaid } from '@/lib/orders';
import { verifyMPPayment } from '@/lib/mercadopago';
import { createClient } from '@/lib/supabase/server';

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

  // Verificar el pago con MP y marcar como pagado (fallback al webhook)
  if (paymentId && orderId && !isPending && !isCash) {
    try {
      const info = await verifyMPPayment(paymentId);
      if (info && info.status === 'approved' && info.orderId === orderId) {
        metodoPago = METODO_LABELS[info.paymentType] ?? info.paymentType ?? null;
        await markOrderPaid(orderId, paymentId, metodoPago ?? undefined);
      }
    } catch {
      // Si falla no bloqueamos la página de éxito
    }
  }

  // Verificar si el usuario está logueado para mostrar "Mis pedidos"
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <div className="section" style={{ textAlign: 'center' }}>
      <div className="container" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
          {isCash ? '🏪' : isPending ? '⏳' : '✅'}
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
