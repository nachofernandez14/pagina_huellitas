import { notFound, permanentRedirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getProductBySlugOrId, getProductSiblings, getProducts } from '@/lib/products';
import { absoluteUrl } from '@/lib/seo/site';
import { categoryPath, isValidCategorySlug } from '@/lib/seo/categories';
import AddToCartButton from './AddToCartButton';
import ProductCard from '@/components/products/ProductCard';
import styles from './page.module.css';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlugOrId(slug);
  if (!product) return { title: 'Producto no encontrado' };

  const price = product.descuento && product.descuento > 0 && product.descuento < (product.precio ?? Infinity)
    ? product.descuento
    : product.precio;

  const categoryLabels: Record<string, string> = {
    perros: 'para perro adulto',
    cachorros: 'para cachorro',
    gatos: 'para gato adulto',
    gatitos: 'para gatito',
    granos: 'grano',
    accesorios: 'accesorio',
  };

  const categoryLabel = categoryLabels[product.categoria] || product.categoria;

  const title = `${product.nombre}${product.kg ? ` ${product.kg}` : ''} - Compra Online en Mendoza`;
  const description = `${product.nombre} ${categoryLabel}${product.kg ? ` de ${product.kg}` : ''}. Precio: ${
    price ? `$${price.toLocaleString('es-AR')}` : 'Consultar'
  }. Petshop Huellitas Mendoza - Alimentos premium y accesorios para mascotas.`;

  return {
    title,
    description,
    keywords: [
      product.nombre,
      categoryLabel,
      'Mendoza',
      'petshop',
      'compra online',
      product.kg ? `${product.kg}` : '',
    ].filter(Boolean),
    alternates: { canonical: `/productos/${product.slug || product.id}` },
    openGraph: {
      title: `${product.nombre} | Huellitas Petshop Mendoza`,
      description: `Compra ${product.nombre} en línea. ${categoryLabel}. Precio: ${
        price ? `$${price.toLocaleString('es-AR')}` : 'Consulta'
      }. Envíos a domicilio.`,
      url: `/productos/${product.slug || product.id}`,
      type: 'website',
      images: product.imagen
        ? [{ url: product.imagen.startsWith('http') ? product.imagen : `/images/${product.imagen}`, alt: product.nombre }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.nombre} - Huellitas Petshop`,
      description,
      images: product.imagen ? [product.imagen.startsWith('http') ? product.imagen : `/images/${product.imagen}`] : [],
    },
  };
}

function formatPrice(n: number | null) {
  if (n === null) return null;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlugOrId(slug);
  if (!product) notFound();

  // Redirect old UUID URLs to SEO-friendly slugs (301 permanente)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug) && product.slug) {
    permanentRedirect(`/productos/${product.slug}`);
  }

  const siblings = await getProductSiblings(product.nombre, product.id);
  const allVariants = [...siblings, product].sort((a, b) =>
    (parseFloat(a.kg ?? '0') || 0) - (parseFloat(b.kg ?? '0') || 0)
  );
  const hasVariants = allVariants.length > 1;

  const related = (await getProducts({ categoria: product.categoria, limit: 8 }))
    .filter((p) => p.nombre !== product.nombre)
    .slice(0, 4);

  const hasDiscount =
    product.descuento != null &&
    product.descuento > 0 &&
    product.descuento < (product.precio ?? Infinity);

  const displayPrice = hasDiscount ? product.descuento! : product.precio;

  const categoryLabel: Record<string, string> = {
    perros: 'Perro adulto',
    cachorros: 'Perro cachorro',
    gatos: 'Gato adulto',
    gatitos: 'Gato cachorro',
    granos: 'Granos',
    accesorios: 'Accesorio',
  };

  const imageSrc = product.imagen
    ? product.imagen.startsWith('http')
      ? product.imagen
      : `/images/${product.imagen}`
    : '/images/no-image.svg';

  const imageAbsolute = imageSrc.startsWith('http') ? imageSrc : absoluteUrl(imageSrc);
  const productUrl = absoluteUrl(`/productos/${product.slug || product.id}`);
  const categoryHref = isValidCategorySlug(product.categoria)
    ? categoryPath(product.categoria)
    : `/productos?categoria=${product.categoria}`;

  return (
    <div className="section">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            '@id': productUrl,
            name: product.nombre,
            description: `${product.nombre}${product.kg ? ` de ${product.kg}` : ''} - ${categoryLabel[product.categoria] || product.categoria}. Compra online en Mendoza.`,
            image: imageAbsolute,
            sku: product.id,
            brand: {
              '@type': 'Brand',
              name: 'Huellitas Petshop',
            },
            category: categoryLabel[product.categoria] || product.categoria,
            offers: {
              '@type': 'Offer',
              url: productUrl,
              priceCurrency: 'ARS',
              price: displayPrice ?? undefined,
              priceValidUntil: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
              availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
              seller: {
                '@type': 'PetStore',
                name: 'Huellitas Petshop',
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: 'Mendoza',
                  addressRegion: 'Mendoza',
                  addressCountry: 'AR',
                },
              },
            },
            ...(hasDiscount && {
              aggregateOffer: {
                '@type': 'AggregateOffer',
                priceCurrency: 'ARS',
                lowPrice: product.descuento?.toString(),
                highPrice: product.precio?.toString(),
                offerCount: '1',
              },
            }),
          }),
        }}
      />
      <div className="container">
        {/* Breadcrumb */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Inicio',
                  item: absoluteUrl('/'),
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Productos',
                  item: absoluteUrl('/productos'),
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: product.categoria.charAt(0).toUpperCase() + product.categoria.slice(1),
                  item: absoluteUrl(categoryHref),
                },
                {
                  '@type': 'ListItem',
                  position: 4,
                  name: product.nombre,
                  item: productUrl,
                },
              ],
            }),
          }}
        />
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Inicio</Link>
          <span>›</span>
          <Link href="/productos">Productos</Link>
          <span>›</span>
          <Link href={categoryHref}>
            {product.categoria.charAt(0).toUpperCase() + product.categoria.slice(1)}
          </Link>
          <span>›</span>
          <span>{product.nombre}</span>
        </nav>

        <div className={styles.grid}>
          {/* ── Image ── */}
          <div className={styles.imgPanel}>
            <Image
              src={imageSrc}
              alt={`${product.nombre}${product.kg ? ` ${product.kg}` : ''} — ${categoryLabel[product.categoria] ?? product.categoria} — Huellitas Petshop Mendoza`}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className={styles.img}
              unoptimized={!imageSrc.startsWith('http') && !imageSrc.includes('supabase')}
              priority
            />
            {product.promo_label && (
              <span className={styles.promoBadge}>{product.promo_label}</span>
            )}
            {!product.promo_label && hasDiscount && (
              <span className={styles.discountBadge}>Oferta</span>
            )}
            {product.kg_regalo && (
              <div className={styles.giftBanner}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                  <path d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                </svg>
                +{product.kg_regalo} GRATIS
              </div>
            )}
          </div>

          {/* ── Info ── */}
          <div className={styles.infoPanel}>
            <h1 className={styles.nombre}>{product.nombre}</h1>
            {categoryLabel[product.categoria] && (
              <span className={styles.catLabel}>{categoryLabel[product.categoria]}</span>
            )}

            {/* Price */}
            <div className={styles.priceBlock}>
              {hasDiscount && (
                <span className={styles.priceOriginal}>{formatPrice(product.precio)}</span>
              )}
              {displayPrice != null ? (
                <span className={styles.price}>{formatPrice(displayPrice)}</span>
              ) : (
                <span className={styles.noPrice}>Consultar precio</span>
              )}
            </div>

            {/* Variants */}
            {hasVariants && (
              <div>
                <p className={styles.variantsLabel}>Elegí el tamaño</p>
                <div className={styles.variants}>
                  {allVariants.map((v) => (
                    <Link
                      key={v.id}
                      href={`/productos/${v.slug || v.id}`}
                      className={`${styles.variantChip} ${v.id === product.id ? styles.variantChipActive : ''}`}
                    >
                      {v.kg ?? 'Sin kg'}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Details */}
            {(product.kg || product.proteina) && (
              <ul className={styles.detailsList}>
                {product.kg && (
                  <li className={styles.detailRow}>
                    <span className={styles.detailKey}>Presentación</span>
                    <span className={styles.detailVal}>{product.kg}</span>
                  </li>
                )}
                {product.proteina && (
                  <li className={styles.detailRow}>
                    <span className={styles.detailKey}>Proteína</span>
                    <span className={`${styles.detailVal} ${styles.detailValProtein}`}>{product.proteina}</span>
                  </li>
                )}
              </ul>
            )}

            {/* Stock */}
            {product.stock > 10 ? (
              <p className={styles.stockOk}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                +10 unidades disponibles
              </p>
            ) : product.stock > 0 ? (
              <p className={styles.stockLow}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {product.stock} unidad{product.stock !== 1 ? 'es' : ''} disponible{product.stock !== 1 ? 's' : ''}
              </p>
            ) : (
              <p className={styles.stockOut}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="12" y2="15" />
                </svg>
                Sin stock
              </p>
            )}


          </div>

          {/* ── Sidebar ── */}
          <aside className={styles.sidebar}>
            {/* Qty + Add to cart */}
            <AddToCartButton product={product} outOfStock={product.stock <= 0} />

            <div className={styles.sideDivider} />

            {/* Payment methods */}
            <p className={styles.payLabel}>Medios de pago</p>
            <div className={styles.payMethods}>
              <span className={styles.payBadge}>Tarjeta de crédito</span>
              <span className={styles.payBadge}>Tarjeta de débito</span>
              <span className={styles.payBadge}>Billetera virtual</span>
              <span className={styles.payBadge}>Efectivo</span>
            </div>

            <div className={styles.sideDivider} />

            {/* Info accordion */}
            <details className={styles.accordion}>
              <summary className={styles.accordionHeader}>Devoluciones</summary>
              <p className={styles.accordionBody}>
                Aceptamos devoluciones dentro de los 7 días de la compra con el producto en su estado original y con ticket de compra.
              </p>
            </details>
            <details className={styles.accordion}>
              <summary className={styles.accordionHeader}>Retiro en local</summary>
              <p className={styles.accordionBody}>
                Podés retirar tu pedido en nuestro local. Lun–Vie 9–13 y 16:45–20:30 · Sáb 9–13:30 y 17–20:30 · Dom 10–13.
              </p>
            </details>
          </aside>
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <section className={styles.relatedSection}>
            <h2 className={styles.relatedTitle}>Productos relacionados</h2>
            <div className={styles.relatedGrid}>
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
