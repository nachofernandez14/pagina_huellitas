import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ProductosCatalog from '@/components/products/ProductosCatalog';
import { getCategorySeo, isValidCategorySlug, categoryPath, slugToProductCategory } from '@/lib/seo/categories';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isValidCategorySlug(slug)) return { title: 'Categoría no encontrada' };

  const seo = getCategorySeo(slug);
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: { canonical: categoryPath(slug) },
    openGraph: {
      title: `${seo.title} | Huellitas Petshop`,
      description: seo.description,
      url: categoryPath(slug),
      type: 'website',
    },
  };
}

export default async function CategoriaPage({ params }: Props) {
  const { slug } = await params;
  if (!isValidCategorySlug(slug)) notFound();

  return (
    <div className="section">
      <div className="container">
        <ProductosCatalog categoria={slugToProductCategory(slug)} />
      </div>
    </div>
  );
}
