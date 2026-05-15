import type { MetadataRoute } from 'next';
import { getProducts } from '@/lib/products';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const products = await getProducts({ limit: 1000 }).catch(() => []);

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${base}/productos/${p.id}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    { url: `${base}`,          lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/productos`, lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/login`,     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
    { url: `${base}/registro`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
    ...productEntries,
  ];
}
