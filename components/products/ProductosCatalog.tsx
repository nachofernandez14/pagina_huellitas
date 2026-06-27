import { Suspense } from 'react';
import { PawPrint } from 'lucide-react';
import Link from 'next/link';
import { getProducts } from '@/lib/products';
import ProductCard from '@/components/products/ProductCard';
import CategoryFilter from '@/components/products/CategoryFilter';
import ProductSearch from '@/components/products/ProductSearch';
import { getCategorySeo, categoryPath, type CategorySlug } from '@/lib/seo/categories';
import { absoluteUrl } from '@/lib/seo/site';
import type { Product, ProductCategory } from '@/types';
import styles from '@/app/(public)/productos/page.module.css';

interface Props {
  categoria?: ProductCategory;
  search?: string;
}

export default function ProductosCatalog({ categoria, search }: Props) {
  return (
    <Suspense fallback={null}>
      <ProductosCatalogInner categoria={categoria} search={search} />
    </Suspense>
  );
}

async function ProductosCatalogInner({ categoria, search }: Props) {
  const products = await getProducts({
    categoria,
    search,
    limit: 100,
  }).catch(() => []);

  const categorySeo = categoria && isCategorySlug(categoria) ? getCategorySeo(categoria) : null;

  const breadcrumbSchema = categorySeo
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: absoluteUrl('/') },
          { '@type': 'ListItem', position: 2, name: 'Productos', item: absoluteUrl('/productos') },
          {
            '@type': 'ListItem',
            position: 3,
            name: categorySeo.h1,
            item: absoluteUrl(categoryPath(categorySeo.slug)),
          },
        ],
      }
    : null;

  const collectionSchema = categorySeo
    ? {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: categorySeo.h1,
        description: categorySeo.description,
        url: absoluteUrl(categoryPath(categorySeo.slug)),
        isPartOf: { '@type': 'WebSite', name: 'Huellitas Petshop', url: absoluteUrl('/') },
        about: {
          '@type': 'PetStore',
          name: 'Huellitas Petshop',
          address: { '@type': 'PostalAddress', addressLocality: 'Mendoza', addressRegion: 'Mendoza', addressCountry: 'AR' },
        },
      }
    : null;

  return (
    <>
      {breadcrumbSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      )}
      {collectionSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      )}

      <div className={styles.header}>
        <div>
          <nav className={styles.breadcrumbNav} aria-label="Breadcrumb">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true"> › </span>
            {categorySeo ? (
              <>
                <Link href="/productos">Productos</Link>
                <span aria-hidden="true"> › </span>
                <span aria-current="page">{categorySeo.slug.charAt(0).toUpperCase() + categorySeo.slug.slice(1)}</span>
              </>
            ) : (
              <span aria-current="page">Productos</span>
            )}
          </nav>
          <h1 className={styles.pageTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {categorySeo ? (
              <>
                {categorySeo.h1}{' '}
                <PawPrint size={22} strokeWidth={1.75} style={{ color: 'var(--green-dark)', flexShrink: 0 }} />
              </>
            ) : (
              'Catálogo de productos para mascotas en Mendoza'
            )}
          </h1>
          {categorySeo ? (
            <p className={styles.categoryIntro}>{categorySeo.intro}</p>
          ) : (
            <p className={styles.categoryIntro}>
              Alimentos premium, granos y accesorios con envío en Gran Mendoza
            </p>
          )}
          <p className={styles.productCount}>
            {products.length} producto{products.length !== 1 ? 's' : ''} encontrado
            {products.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Suspense fallback={null}>
          <ProductSearch />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <CategoryFilter />
      </Suspense>

      {products.length === 0 ? (
        <div className={styles.empty}>
          <p className="text-gray">
            No se encontraron productos{search ? ` para "${search}"` : ''}.
          </p>
        </div>
      ) : (
        <div className="products-grid">
          {groupByNombre(products).map(({ representative, group }) => (
            <ProductCard key={representative.id} product={representative} groupProducts={group} />
          ))}
        </div>
      )}

      {categorySeo && (
        <section className={styles.relatedCategories} aria-labelledby="related-cats-heading">
          <h2 id="related-cats-heading" className={styles.relatedCategoriesTitle}>
            Otras categorías
          </h2>
          <ul className={styles.relatedCategoriesList}>
            {(['perros', 'cachorros', 'gatos', 'gatitos', 'granos', 'accesorios'] as CategorySlug[])
              .filter((s) => s !== categorySeo.slug)
              .slice(0, 4)
              .map((slug) => {
                const seo = getCategorySeo(slug);
                return (
                  <li key={slug}>
                    <Link href={categoryPath(slug)}>{seo.title.replace(' en Mendoza', '')}</Link>
                  </li>
                );
              })}
          </ul>
        </section>
      )}
    </>
  );
}

function isCategorySlug(value: string): value is CategorySlug {
  return ['perros', 'cachorros', 'gatos', 'gatitos', 'granos', 'accesorios'].includes(value);
}

function groupByNombre(products: Product[]): { representative: Product; group: Product[] }[] {
  const map = new Map<string, Product[]>();
  for (const p of products) {
    const key = p.nombre.trim().toLowerCase();
    const existing = map.get(key);
    if (existing) existing.push(p);
    else map.set(key, [p]);
  }
  return [...map.values()].map((group) => {
    const sorted = [...group].sort((a, b) => (b.precio ?? 0) - (a.precio ?? 0));
    return { representative: sorted[0], group: sorted };
  });
}
