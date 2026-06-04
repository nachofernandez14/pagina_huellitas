import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/context/CartContext';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://petshophuellitas.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Huellitas Petshop | Alimentos y Accesorios para Mascotas en Mendoza',
    template: '%s | Huellitas Petshop Mendoza',
  },
  description:
    'Petshop online en Mendoza con alimentos premium para perros, gatos y cachorros. Granos al por mayor, accesorios y envíos a domicilio. Compra con Mercado Pago. ¡Donde cada huellita importa!',
  keywords: [
    'petshop Mendoza', 'petshop Guaymallén', 'alimentos perros Mendoza', 'alimentos gatos Mendoza',
    'tienda mascotas online Mendoza', 'comida premium mascotas', 'accesorios mascotas Mendoza',
    'granos al por mayor Mendoza', 'Huellitas Petshop', 'envío mascotas Gran Mendoza',
    'comida cachorro Mendoza', 'comida gatito Mendoza', 'pet shop Rodeo de la Cruz',
  ],
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
  manifest: '/manifest.webmanifest',
  authors: [{ name: 'Huellitas Petshop' }],
  robots: {
    index: true,
    follow: true,
    googleBot: { 
      index: true, 
      follow: true, 
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/images/favicon.png',
    apple: '/images/favicon.png',
  },
  openGraph: {
    title: 'Huellitas Petshop | Alimentos y Accesorios para Mascotas en Mendoza',
    description: 'Alimentos premium para perros, gatos y cachorros. Granos al por mayor y accesorios. Envíos a domicilio en Mendoza. Compra online ahora.',
    type: 'website',
    locale: 'es_AR',
    siteName: 'Huellitas Petshop',
    url: 'https://petshophuellitas.com',
    images: [{ url: '/images/logo_huellitas.png', width: 512, height: 512, alt: 'Huellitas Petshop Mendoza' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Huellitas Petshop | Mascotas en Mendoza',
    description: 'Alimentos premium, accesorios y granos. Envíos a domicilio. Compra con Mercado Pago.',
    images: ['/images/logo_huellitas.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
