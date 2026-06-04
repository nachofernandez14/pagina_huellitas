import type { Metadata } from 'next';
import FAQContent from './FAQContent';
import { FAQ_ITEMS } from '@/lib/seo/faq';

export const metadata: Metadata = {
  title: 'Preguntas Frecuentes — Envíos y Compras en Mendoza',
  description:
    'Preguntas frecuentes sobre envíos en Gran Mendoza, métodos de pago, devoluciones, horarios y tienda en Rodeo de la Cruz. Huellitas Petshop.',
  alternates: { canonical: '/faq' },
  openGraph: {
    title: 'FAQ | Huellitas Petshop Mendoza',
    description: 'Envíos, pagos y atención en Mendoza. Respuestas rápidas sobre tu compra.',
    url: '/faq',
    type: 'website',
  },
};

export default function FAQPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <div className="section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div className="container">
        <FAQContent />
      </div>
    </div>
  );
}
