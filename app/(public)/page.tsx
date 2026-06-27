import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { getProducts, getTopOffers } from '@/lib/products';
import ProductCard from '@/components/products/ProductCard';
import HeroCarousel from '@/components/ui/HeroCarousel';
import OffersCarousel from '@/components/ui/OffersCarousel';
import Ticker from '@/components/ui/Ticker';
import PromoBanner from '@/components/ui/PromoBanner';
import styles from './page.module.css';
import MarcasSection from '@/components/ui/MarcasSection';
import { Truck, ShieldCheck, Star, MessageCircle, Flame } from 'lucide-react';
import { absoluteUrl, getSiteUrl } from '@/lib/seo/site';
import { categoryPath, type CategorySlug } from '@/lib/seo/categories';

export const metadata: Metadata = {
  title: 'Huellitas Petshop | Alimentos y Accesorios Premium para Mascotas en Mendoza',
  description: 'Petshop online en Mendoza con alimentos premium para perros, gatos y cachorros. Granos al por mayor, accesorios y envíos rápidos a domicilio. Compra con Mercado Pago. ¡Donde cada huellita importa!',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Huellitas Petshop | Alimentos y Accesorios para Mascotas en Mendoza',
    description: 'Alimentos premium para perros, gatos y cachorros. Granos al por mayor y accesorios. Envíos a domicilio. Compra online con Mercado Pago.',
    url: '/',
    type: 'website',
    images: [{ url: '/images/logo_huellitas.png', width: 512, height: 512, alt: 'Huellitas Petshop' }],
  },
};

const SHOW_PROMO_BANNER = true;

const siteUrl = getSiteUrl();

const JSONLD_WEBSITE = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${siteUrl}/#website`,
  name: 'Huellitas Petshop',
  url: siteUrl,
  description: 'Petshop online en Mendoza — alimentos y accesorios para mascotas con envío en Gran Mendoza.',
  inLanguage: 'es-AR',
  publisher: { '@id': `${siteUrl}/#business` },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${siteUrl}/productos?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

const JSONLD_LOCAL_BUSINESS = {
  '@context': 'https://schema.org',
  '@type': ['PetStore', 'LocalBusiness'],
  '@id': `${siteUrl}/#business`,
  name: 'Huellitas Petshop',
  description: 'Petshop en Mendoza con alimentos premium, accesorios y granos al por mayor para perros, gatos y cachorros. Envíos a domicilio en Gran Mendoza.',
  url: siteUrl,
  image: absoluteUrl('/images/logo_huellitas.png'),
  logo: absoluteUrl('/images/logo_huellitas.png'),
  priceRange: '$$',
  telephone: '+5492616635666',
  email: 'petshophuellitas65@gmail.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Rodeo de la Cruz',
    addressLocality: 'Mendoza',
    addressRegion: 'Mendoza',
    addressCountry: 'AR',
    postalCode: '5500',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: -32.8753,
    longitude: -68.8458,
  },
  areaServed: [
    { '@type': 'City', name: 'Mendoza' },
    { '@type': 'City', name: 'Guaymallén' },
    { '@type': 'City', name: 'Las Heras' },
    { '@type': 'City', name: 'Maipú' },
    { '@type': 'City', name: 'Godoy Cruz' },
    { '@type': 'City', name: 'Luján de Cuyo' },
  ],
  hasMap: 'https://maps.google.com/?q=Huellitas+Petshop+Mendoza',
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '13:15',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '16:45',
      closes: '20:30',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Saturday',
      opens: '09:00',
      closes: '13:30',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Saturday',
      opens: '17:00',
      closes: '20:30',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Sunday',
      opens: '10:00',
      closes: '13:00',
    },
  ],
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      telephone: '+5492616635666',
      availableLanguage: 'Spanish',
      areaServed: 'AR',
    },
    {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      url: 'https://wa.me/5492616635666',
      availableLanguage: 'Spanish',
    },
  ],
  sameAs: [
    'https://www.facebook.com/huellitaspetshop',
    'https://www.instagram.com/huellitaspetshop',
    'https://wa.me/5492616635666',
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Alimentos y accesorios para mascotas',
    itemListElement: [
      { '@type': 'OfferCatalog', name: 'Alimentos para perros', url: absoluteUrl(categoryPath('perros')) },
      { '@type': 'OfferCatalog', name: 'Alimentos para gatos', url: absoluteUrl(categoryPath('gatos')) },
      { '@type': 'OfferCatalog', name: 'Alimentos para cachorros', url: absoluteUrl(categoryPath('cachorros')) },
      { '@type': 'OfferCatalog', name: 'Alimentos para gatitos', url: absoluteUrl(categoryPath('gatitos')) },
      { '@type': 'OfferCatalog', name: 'Granos al por mayor', url: absoluteUrl(categoryPath('granos')) },
      { '@type': 'OfferCatalog', name: 'Accesorios', url: absoluteUrl(categoryPath('accesorios')) },
    ],
  },
  paymentAccepted: ['Mercado Pago', 'Cash'],
  currenciesAccepted: 'ARS',
};

const CATEGORIES: { value: CategorySlug; label: string; img: string }[] = [
  { value: 'perros',     label: 'Perros',     img: '/images/categorias/perro-adulto.png' },
  { value: 'cachorros',  label: 'Cachorros',  img: '/images/categorias/cachorro.png' },
  { value: 'gatos',      label: 'Gatos',      img: '/images/categorias/gato-adulto.png' },
  { value: 'gatitos',    label: 'Gatitos',    img: '/images/categorias/gatito.png' },
  { value: 'granos',     label: 'Granos',     img: '/images/categorias/granos.png' },
  { value: 'accesorios', label: 'Accesorios', img: '/images/categorias/accesorios.png' },
];

export default async function HomePage() {
  'use cache';
  cacheLife('hours');
  cacheTag('products');

  const [featured, offers] = await Promise.all([
    getProducts({ limit: 8 }).catch(() => []),
    getTopOffers(9).catch(() => []),
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD_WEBSITE) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD_LOCAL_BUSINESS) }} />
      <h1 className="sr-only">
        Huellitas Petshop — Alimentos y accesorios para mascotas en Mendoza y Gran Mendoza
      </h1>
      <HeroCarousel />
      <Ticker />

      <section className={`section ${styles.sectionCats}`}>
        <div className="container">
          <h2 className="section-title text-center">Nuestras categorías</h2>
          <p className="section-subtitle text-center">Encontrá todo lo que necesita tu mascota</p>
          <div className={styles.catGrid}>
            {CATEGORIES.map((cat) => (
              <Link key={cat.value} href={categoryPath(cat.value)} className={styles.catCard}>
                <div className={styles.catCircle}>
                  <Image 
                    src={cat.img} 
                    alt={`${cat.label} - Alimentos y accesorios para mascotas - Huellitas Petshop Mendoza`}
                    width={360} 
                    height={360} 
                    className={styles.catImg} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} 
                    sizes="(max-width: 480px) 68px, (max-width: 820px) 86px, 180px"
                    loading="lazy"
                  />
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
            <p className={`section-subtitle text-center ${styles.offersSubtitle}`}>Los mejores descuentos de la semana</p>
          <OffersCarousel products={offers} />
        </div>
      </section>

      {SHOW_PROMO_BANNER && <PromoBanner />}

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

      <section className={styles.sectionLostPets}>
        <div className="container">
          <div className={styles.lostPetsInner}>
            <div className={styles.lostPetsContent}>
              <span className={styles.lostPetsTag}>Ayudanos a ayudar</span>
              <h2 className={styles.lostPetsTitle}>Mascotas perdidas</h2>
              <p className={styles.lostPetsDesc}>
                ¿Perdiste o encontraste una mascota? Publicá un aviso gratis y ayudanos a reencontrarlas con sus familias. Entre todos podemos hacer la diferencia.
              </p>
              <div className={styles.lostPetsActions}>
                <Link href="/mascotas/nuevo" className={styles.lostPetsBtnPrimary}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Publicar aviso
                </Link>
                <Link href="/mascotas" className={styles.lostPetsBtnSecondary}>
                  Ver avisos
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </Link>
              </div>
            </div>
            <div className={styles.lostPetsImageWrap}>
              <Image
                src="/images/perro_perdido.jpg"
                alt="Perro perdido - ayudanos a encontrarlo"
                width={3633}
                height={5460}
                className={styles.lostPetsImage}
                sizes="(max-width: 768px) 100vw, 400px"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
