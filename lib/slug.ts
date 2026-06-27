const ACCENT_MAP: Record<string, string> = {
  á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u',
  ä: 'a', ë: 'e', ï: 'i', ö: 'o', ü: 'u',
  ñ: 'n',
};

const INVISIBLE_RE = /[\u2000-\u206F\uFEFF\u00AD]/g;

export function slugify(text: string): string {
  let s = text.toString().toLowerCase().trim();
  s = s.replace(INVISIBLE_RE, '');
  s = s.replace(/[áéíóúäëïöüñ]/g, (ch) => ACCENT_MAP[ch] || ch);
  s = s.replace(/[^a-z0-9\s-]/g, '');
  s = s.replace(/[\s_]+/g, '-');
  s = s.replace(/-+/g, '-');
  s = s.replace(/^-+|-+$/g, '');
  return s;
}

export function generateProductSlug(nombre?: string | null, kg?: string | null): string {
  let slug = slugify(nombre ?? '');
  if (kg) {
    slug += `-${slugify(kg)}`;
  }
  return slug;
}

export function productUrl(slug?: string | null, id?: string): string {
  return `/productos/${slug || id || ''}`;
}
