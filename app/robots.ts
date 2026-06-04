import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo/site';

const PRIVATE_PATHS = [
  '/admin/',
  '/api/',
  '/checkout',
  '/login',
  '/registro',
  '/perfil',
  '/recuperar-contrasena',
  '/carrito',
];

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin/', '/api/', '/checkout', '/login', '/registro', '/perfil', '/recuperar-contrasena'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
