import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProductById, getProducts, getProductSiblings } from '@/lib/products';
import ProductDetail from './ProductDetail';
import styles from './page.module.css';

interface Props {
  params: Promise<{ id: string }>;
}

function formatPrice(n: number | null): string {
  if (n === null) return 'Consultar precio';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

function getImageUrl(imagen: string | undefined, base: string): string {
  if (!imagen) return `${base}/images/logo_huellitas.png`;
  if (imagen.startsWith('http')) return imagen;
  return `${base}/images/${imagen}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  if (!product) {
    return { title: 'Producto no encontrado' };
  }

  const imageUrl = getImageUrl(product.imagen, base);
  const price = product.descuento && product.descuento > 0 && product.descuento < (product.precio ?? Infinity)
    ? product.descuento
    : product.precio;
  const kgStr = product.kg ? ` ${product.kg}` : '';
  const description = `Comprá ${product.nombre}${kgStr} en Huellitas Petshop Mendoza. ${formatPrice(price)}. Categoría: ${product.categoria}. Envíos a domicilio con Mercado Pago.`;

  return {
    title: `${product.nombre}${kgStr}`,
    description,
    alternates: { canonical: `/productos/${id}` },
    openGraph: {
      title: `${product.nombre}${kgStr} | Huellitas Petshop`,
      description,
      url: `/productos/${id}`,
      type: 'website',
      images: [{ url: imageUrl, width: 800, height: 800, alt: product.nombre }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.nombre}${kgStr} | Huellitas Petshop`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProductoPage({ params }: Props) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const [related, siblings] = await Promise.all([
    getProducts({ categoria: product.categoria, limit: 5 }).catch(() => []),
    getProductSiblings(product.nombre, product.id),
  ]);
  const otherRelated = related.filter((p) => p.id !== product.id).slice(0, 4);

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const imageUrl = getImageUrl(product.imagen, base);
  const price = product.descuento && product.descuento > 0 && product.descuento < (product.precio ?? Infinity)
    ? product.descuento
    : product.precio;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.nombre,
    image: imageUrl,
    description: `${product.nombre}${product.kg ? ` ${product.kg}` : ''} — Alimento para ${product.categoria} disponible en Huellitas Petshop Mendoza.`,
    brand: { '@type': 'Brand', name: 'Huellitas Petshop' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'ARS',
      price: price ?? 0,
      availability: product.stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${base}/productos/${product.id}`,
      seller: { '@type': 'Organization', name: 'Huellitas Petshop' },
    },
    ...(product.proteina ? { additionalProperty: { '@type': 'PropertyValue', name: 'Proteína', value: product.proteina } } : {}),
  };

  return (
    <div className="section">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container">
        <Link href="/productos" className={styles.back}>
          ← Volver a productos
        </Link>

        <ProductDetail product={product} siblings={siblings} />

        {otherRelated.length > 0 && (
          <div className={styles.related}>
            <h2 className="section-title">Productos relacionados</h2>
            <div className="products-grid" style={{ marginTop: '1rem' }}>
              {otherRelated.map((p) => (
                <Link key={p.id} href={`/productos/${p.id}`} className={`card ${styles.relCard}`}>
                  <div className={styles.relImg}>
                    <Image
                      src={
                        p.imagen
                          ? p.imagen.startsWith('http') ? p.imagen : `/images/${p.imagen}`
                          : '/images/no-image.svg'
                      }
                      alt={p.nombre}
                      fill
                      sizes="160px"
                      style={{ objectFit: 'contain', padding: '0.5rem' }}
                    />
                  </div>
                  <div style={{ padding: '0.75rem' }}>
                    <p className={styles.relName}>{p.nombre}</p>
                    <p style={{ fontFamily: 'var(--font-title)', color: 'var(--green-dark)', fontWeight: 700 }}>
                      {formatPrice(p.precio)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
