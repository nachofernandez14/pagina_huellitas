import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getProducts, getTopOffers } from '@/lib/products';
import ProductCard from '@/components/products/ProductCard';
import HeroCarousel from '@/components/ui/HeroCarousel';
import OffersCarousel from '@/components/ui/OffersCarousel';
import Ticker from '@/components/ui/Ticker';
import styles from './page.module.css';
import MarcasSection from '@/components/ui/MarcasSection';
import { Truck, ShieldCheck, Star, MessageCircle, Flame } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Huellitas Petshop | Alimentos y Accesorios para Mascotas en Mendoza',
  description:
    'Petshop en Mendoza. Alimentos premium para perros y gatos, accesorios y granos al por mayor. Envíos a Rodeo de la Cruz, Corralitos, KM 8 y Primavera. Comprá online con Mercado Pago.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Huellitas Petshop | Alimentos y Accesorios para Mascotas en Mendoza',
    description: 'Petshop en Mendoza. Alimentos premium, accesorios y granos. Envíos a domicilio. Comprá con Mercado Pago.',
    url: '/',
    type: 'website',
  },
};

const JSONLD_LOCAL_BUSINESS = {
  '@context': 'https://schema.org',
  '@type': 'PetStore',
  name: 'Huellitas Petshop',
  description: 'Petshop en Mendoza. Alimentos premium para perros y gatos, accesorios y granos al por mayor.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  image: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/images/logo_huellitas.png`,
  priceRange: '$$',
  address: {
    '@type': 'PostalAddress',
    addressRegion: 'Mendoza',
    addressCountry: 'AR',
  },
  areaServed: [
    'Rodeo de la Cruz', 'Corralitos', 'Mendoza', 'Guaymallén',
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Alimentos y accesorios para mascotas',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: 'Spanish',
  },
};

const CATEGORIES = [
  { value: 'perros',     label: 'Perros',     img: '/images/categorias/perro-adulto.png' },
  { value: 'cachorros',  label: 'Cachorros',  img: '/images/categorias/cachorro.png' },
  { value: 'gatos',      label: 'Gatos',      img: '/images/categorias/gato-adulto.png' },
  { value: 'gatitos',    label: 'Gatitos',    img: '/images/categorias/gatito.png' },
  { value: 'granos',     label: 'Granos',     img: '/images/categorias/granos.png' },
  { value: 'accesorios', label: 'Accesorios', img: '/images/categorias/accesorios.png' },
];

export default async function HomePage() {
  const [featured, offers] = await Promise.all([
    getProducts({ limit: 8 }).catch(() => []),
    getTopOffers(9).catch(() => []),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD_LOCAL_BUSINESS) }}
      />
      <HeroCarousel />
      <Ticker />

      <section className={`section ${styles.sectionCats}`}>
        <div className="container">
          <h2 className="section-title text-center">Nuestras categorías</h2>
          <p className="section-subtitle text-center">Encontrá todo lo que necesita tu mascota</p>
          <div className={styles.catGrid}>
            {CATEGORIES.map((cat) => (
              <Link key={cat.value} href={`/productos?categoria=${cat.value}`} className={styles.catCard}>
                <div className={styles.catCircle}>
                  <Image src={cat.img} alt={cat.label} fill style={{ objectFit: 'cover' }} sizes="(max-width: 480px) 68px, (max-width: 820px) 86px, 180px" />
                </div>
                <h3 className={styles.catLabel}>{cat.label}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={`section ${styles.sectionOffers}`}>
        <div className="container">
            <h2 className={`section-title text-center ${styles.offersTitle}`}>
              <Flame size={28} strokeWidth={1.5} className={styles.offersTitleIcon} />
              Ofertas imperdibles
              <Flame size={28} strokeWidth={1.5} className={`${styles.offersTitleIcon} ${styles.offersTitleIconRight}`} />
            </h2>
            <p className="section-subtitle text-center">Los mejores descuentos de la semana</p>
          <OffersCarousel products={offers} />
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section" style={{ background: 'var(--white)' }}>
          <div className="container">
            <h2 className="section-title text-center">Productos destacados</h2>
            <div className="products-grid">
              {featured.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <Link href="/productos" className="btn btn-outline">Ver todos</Link>
            </div>
          </div>
        </section>
      )}

      <section className={`section ${styles.sectionTrust}`}>
        <div className="container">
          <h2 className={styles.sectionTrustTitle}>¿Por qué elegirnos?</h2>
          <p className={styles.sectionTrustSub}>Tu mascota merece lo mejor, y vos merecés la mejor experiencia</p>
          <div className={styles.trustGrid}>
            {[
              { icon: <Truck size={28} strokeWidth={1.5} />, title: 'Envío a domicilio', desc: 'Rodeo de la Cruz, Corralitos, KM 8 y Primavera' },
              { icon: <ShieldCheck size={28} strokeWidth={1.5} />, title: 'Pago seguro', desc: 'Mercado Pago con todas las tarjetas' },
              { icon: <Star size={28} strokeWidth={1.5} />, title: 'Calidad garantizada', desc: 'Solo las mejores marcas del mercado' },
              { icon: <MessageCircle size={28} strokeWidth={1.5} />, title: 'Asesoramiento', desc: 'Te ayudamos a elegir el mejor producto' },
            ].map((item) => (
              <div key={item.title} className={styles.trustItem}>
                <div className={styles.trustIconWrap}>{item.icon}</div>
                <h4 className={styles.trustTitle}>{item.title}</h4>
                <p className={styles.trustDesc}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarcasSection />
    </>
  );
}
