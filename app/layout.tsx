import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/context/CartContext';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Huellitas Petshop | Todo para tu mascota en Mendoza',
    template: '%s | Huellitas Petshop',
  },
  description:
    'Petshop en Mendoza. Alimentos premium para perros y gatos, accesorios y granos al por mayor. Envíos a domicilio y retiro en local. ¡Donde cada huellita importa!',
  keywords: [
    'petshop Mendoza', 'alimentos para perros Mendoza', 'alimentos para gatos Mendoza',
    'comida para mascotas', 'accesorios mascotas', 'granos al por mayor',
    'Huellitas Petshop', 'cachorro', 'gatito', 'veterinaria', 'envío mascotas',
  ],
  authors: [{ name: 'Huellitas Petshop' }],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  icons: {
    icon: '/images/logo_huellitas.png',
    apple: '/images/logo_huellitas.png',
  },
  openGraph: {
    title: 'Huellitas Petshop | Todo para tu mascota en Mendoza',
    description: 'Alimentos premium, accesorios y granos para perros y gatos. Envíos a domicilio en Mendoza.',
    type: 'website',
    locale: 'es_AR',
    siteName: 'Huellitas Petshop',
    images: [{ url: '/images/logo_huellitas.png', width: 512, height: 512, alt: 'Huellitas Petshop' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Huellitas Petshop | Todo para tu mascota en Mendoza',
    description: 'Alimentos premium, accesorios y granos para perros y gatos. Envíos en Mendoza.',
    images: ['/images/logo_huellitas.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
