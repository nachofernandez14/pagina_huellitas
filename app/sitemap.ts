import type { MetadataRoute } from 'next';
import { getProducts } from '@/lib/products';
import { CATEGORY_SLUGS, categoryPath } from '@/lib/seo/categories';
import { getSiteUrl } from '@/lib/seo/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();

  const products = await getProducts({ limit: 1000 }).catch(() => []);

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${base}/productos/${p.slug || p.id}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const categories: MetadataRoute.Sitemap = CATEGORY_SLUGS.map((slug) => ({
    url: `${base}${categoryPath(slug)}`,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  const legalPages: MetadataRoute.Sitemap = [
    { url: `${base}/faq`, changeFrequency: 'monthly' as const, priority: 0.75 },
    { url: `${base}/legal/envios`, changeFrequency: 'monthly' as const, priority: 0.65 },
    { url: `${base}/legal/privacidad`, changeFrequency: 'yearly' as const, priority: 0.35 },
    { url: `${base}/legal/terminos`, changeFrequency: 'yearly' as const, priority: 0.35 },
  ];

  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${base}/productos`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.95 },
    ...categories,
    ...legalPages,
    ...productEntries,
  ];
}
