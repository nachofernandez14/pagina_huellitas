import { Suspense } from 'react';
import type { Metadata } from 'next';
import ProductosCatalog from '@/components/products/ProductosCatalog';
import styles from './page.module.css';

interface Props {
  searchParams: Promise<{ categoria?: string; q?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;

  if (q) {
    return {
      title: `Búsqueda: ${q}`,
      description: `Resultados para "${q}" en Huellitas Petshop Mendoza. Alimentos y accesorios para mascotas con envío en Gran Mendoza.`,
      robots: { index: false, follow: true },
      alternates: { canonical: `/productos?q=${encodeURIComponent(q)}` },
    };
  }

  return {
    title: 'Catálogo de Productos para Mascotas en Mendoza',
    description:
      'Explorá alimentos premium, granos al por mayor y accesorios para perros y gatos. Envío a domicilio en Mendoza, Guaymallén y Las Heras. Huellitas Petshop.',
    alternates: { canonical: '/productos' },
    openGraph: {
      title: 'Productos | Huellitas Petshop Mendoza',
      description: 'Alimentos y accesorios para mascotas. Compra online con envío en Gran Mendoza.',
      url: '/productos',
      type: 'website',
    },
  };
}

export default function ProductosPage({ searchParams }: Props) {
  return (
    <div className="section">
      <div className="container">
        <Suspense fallback={null}>
          <ProductosSearchContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function ProductosSearchContent({ searchParams }: Props) {
  const { q } = await searchParams;
  return <ProductosCatalog search={q} />;
}
