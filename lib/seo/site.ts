/** Canonical site URL for SEO (metadata, schema, sitemap). */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://petshophuellitas.com';
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl().replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
