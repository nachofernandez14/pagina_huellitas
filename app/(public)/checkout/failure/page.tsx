import Link from 'next/link';

export default function CheckoutFailurePage() {
  return (
    <div className="section" style={{ textAlign: 'center' }}>
      <div className="container" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>❌</div>
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
