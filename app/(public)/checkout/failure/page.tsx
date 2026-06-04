import Link from 'next/link';
import { cancelOrder } from '@/lib/orders';

interface Props {
  searchParams: Promise<{ order?: string }>;
}

export default async function CheckoutFailurePage({ searchParams }: Props) {
  const params = await searchParams;

  // Cancel the pending order if we received one from MP's back_url
  if (params.order) {
    try {
      await cancelOrder(params.order);
    } catch { /* silent — never block the failure page */ }
  }

  return (
    <div className="section" style={{ textAlign: 'center' }}>
      <div className="container" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#e53e3e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h1 className="section-title" style={{ marginBottom: '0.75rem' }}>
          El pago no fue aprobado
        </h1>
        <p className="text-gray" style={{ marginBottom: '2rem' }}>
          Podés intentarlo nuevamente o contactarnos por WhatsApp para ayudarte.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/checkout" className="btn btn-accent">
            Intentar nuevamente
          </Link>
          <a
            href="https://wa.me/5492616635666"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

