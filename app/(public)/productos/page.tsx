import { Suspense } from 'react';
import { PawPrint } from 'lucide-react';
import { getProducts } from '@/lib/products';
import ProductCard from '@/components/products/ProductCard';
import CategoryFilter from '@/components/products/CategoryFilter';
import ProductSearch from '@/components/products/ProductSearch';
import type { ProductCategory, Product } from '@/types';
import styles from './page.module.css';

interface Props {
  searchParams: Promise<{ categoria?: string; q?: string }>;
}

export const metadata = {
  title: 'Todos los Productos',
  description: 'Explorá alimentos premium para perros, gatos, cachorros y gatitos. Granos al por mayor y accesorios. Petshop online en Mendoza con envíos a domicilio.',
  alternates: { canonical: '/productos' },
  openGraph: {
    title: 'Productos | Huellitas Petshop Mendoza',
    description: 'Alimentos para perros, gatos, cachorros y gatitos. Granos y accesorios. Envíos en Mendoza.',
    url: '/productos',
    type: 'website',
  },
};

export default async function ProductosPage({ searchParams }: Props) {
  const { categoria, q } = await searchParams;

  const products = await getProducts({
    categoria: categoria as ProductCategory | undefined,
    search: q,
    limit: 100,
  }).catch(() => []);

  return (
    <div className="section">
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {categoria ? (
                <>{capitalize(categoria)} <PawPrint size={22} strokeWidth={1.75} style={{ color: 'var(--green-dark)', flexShrink: 0 }} /></>
              ) : 'Todos los productos'}
            </h1>
            <p className="section-subtitle">
              {products.length} producto{products.length !== 1 ? 's' : ''} encontrado{products.length !== 1 ? 's' : ''}
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
            <p className="text-gray">No se encontraron productos{q ? ` para "${q}"` : ''}.</p>
          </div>
        ) : (
          <div className="products-grid">
            {groupByNombre(products).map(({ representative, group }) => (
              <ProductCard key={representative.id} product={representative} groupProducts={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function groupByNombre(products: Product[]): { representative: Product; group: Product[] }[] {
  const map = new Map<string, Product[]>();
  for (const p of products) {
    const existing = map.get(p.nombre);
    if (existing) {
      existing.push(p);
    } else {
      map.set(p.nombre, [p]);
    }
  }
  return [...map.values()].map((group) => ({ representative: group[0], group }));
}
