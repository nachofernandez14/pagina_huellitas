import type { ProductCategory } from '@/types';

export const CATEGORY_SLUGS = [
  'perros',
  'cachorros',
  'gatos',
  'gatitos',
  'granos',
  'accesorios',
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export function isValidCategorySlug(slug: string): slug is CategorySlug {
  return (CATEGORY_SLUGS as readonly string[]).includes(slug);
}

export function categoryPath(slug: CategorySlug): string {
  return `/categoria/${slug}`;
}

export interface CategorySeo {
  slug: CategorySlug;
  h1: string;
  title: string;
  description: string;
  intro: string;
  keywords: string[];
}

const SEO: Record<CategorySlug, CategorySeo> = {
  perros: {
    slug: 'perros',
    h1: 'Alimentos para perros adultos en Mendoza',
    title: 'Alimentos para Perros Adultos en Mendoza',
    description:
      'Comprá alimento premium para perros adultos en Mendoza. Marcas Agility, Pedigree, Sieger y más. Envío a domicilio en Gran Mendoza y retiro en local.',
    intro:
      'En Huellitas Petshop encontrás alimentos balanceados y premium para perros adultos en Mendoza y Gran Mendoza. Trabajamos marcas reconocidas, distintos pesos y fórmulas según el tamaño de tu perro. Comprá online con Mercado Pago o retirá en nuestro local en Rodeo de la Cruz.',
    keywords: ['alimento perros Mendoza', 'comida perros adultos', 'petshop perros Mendoza', 'envío perros Mendoza'],
  },
  cachorros: {
    slug: 'cachorros',
    h1: 'Alimentos para cachorros en Mendoza',
    title: 'Alimentos para Cachorros en Mendoza',
    description:
      'Alimento para cachorros en desarrollo en Mendoza. Fórmulas nutritivas, envío a domicilio y asesoramiento por WhatsApp en Huellitas Petshop.',
    intro:
      'Elegí el alimento ideal para el crecimiento de tu cachorro en Mendoza. En Huellitas tenés opciones por etapa y tamaño, con marcas de calidad y envíos a domicilio en Mendoza o retiro en el local.',
    keywords: ['alimento cachorros Mendoza', 'comida cachorro', 'petshop cachorros', 'envío mascotas Mendoza'],
  },
  gatos: {
    slug: 'gatos',
    h1: 'Alimentos para gatos adultos en Mendoza',
    title: 'Alimentos para Gatos Adultos en Mendoza',
    description:
      'Alimento premium para gatos adultos en Mendoza. Whiskas, Cat Chow y más marcas. Envío a domicilio en Gran Mendoza desde Huellitas Petshop.',
    intro:
      'Cuidá la nutrición de tu gato adulto con alimentos seleccionados en Huellitas Petshop Mendoza. Catálogo online con envío a domicilio en Mendoza, Guaymallén, Las Heras y zonas cercanas, o retiro en local.',
    keywords: ['alimento gatos Mendoza', 'comida gatos adultos', 'petshop gatos Mendoza'],
  },
  gatitos: {
    slug: 'gatitos',
    h1: 'Alimentos para gatitos en Mendoza',
    title: 'Alimentos para Gatitos en Mendoza',
    description:
      'Alimento para gatitos en crecimiento en Mendoza. Desarrollo saludable, envíos rápidos y compra online en Huellitas Petshop.',
    intro:
      'Alimentos formulados para gatitos en Mendoza, con la calidad que necesitan en su etapa de crecimiento. Comprá desde la web con Mercado Pago y recibí tu pedido en casa o retiralo en nuestro petshop.',
    keywords: ['alimento gatitos Mendoza', 'comida gatito', 'petshop gatos Mendoza'],
  },
  granos: {
    slug: 'granos',
    h1: 'Granos al por mayor para mascotas en Mendoza',
    title: 'Granos al Por Mayor en Mendoza',
    description:
      'Granos para mascotas al por mayor en Mendoza. Precios especiales para criadores y comercios. Huellitas Petshop — consultá por WhatsApp.',
    intro:
      'Granos y alimentos a granel para perros y gatos con precios competitivos en Mendoza. Ideal para criadores, petshops chicos y familias con varias mascotas. Coordiná tu pedido por la web o WhatsApp.',
    keywords: ['granos mascotas Mendoza', 'alimento por mayor Mendoza', 'granos perros gatos'],
  },
  accesorios: {
    slug: 'accesorios',
    h1: 'Accesorios para mascotas en Mendoza',
    title: 'Accesorios para Mascotas en Mendoza',
    description:
      'Accesorios para perros y gatos en Mendoza: comederos, collares, juguetes y más. Compra online con envío en Huellitas Petshop.',
    intro:
      'Complementá el cuidado de tu mascota con accesorios en Huellitas Petshop Mendoza. Encontrá productos prácticos para el día a día, con envío a domicilio en Gran Mendoza y retiro en Rodeo de la Cruz.',
    keywords: ['accesorios mascotas Mendoza', 'petshop accesorios', 'juguetes perros gatos Mendoza'],
  },
};

export function getCategorySeo(slug: CategorySlug): CategorySeo {
  return SEO[slug];
}

export function slugToProductCategory(slug: CategorySlug): ProductCategory {
  return slug;
}
