const INTERNAL_BASE_ORIGIN = 'https://internal.invalid';

const MERCADO_PAGO_HOST_SUFFIXES = [
  'mercadopago.com',
  'mercadopago.com.ar',
  'mercadopago.com.br',
  'mercadopago.com.co',
  'mercadopago.com.mx',
  'mercadopago.com.pe',
  'mercadopago.com.uy',
  'mercadopago.cl',
];

function matchesHostSuffix(hostname: string, suffixes: string[]): boolean {
  const host = hostname.toLowerCase();
  return suffixes.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

/**
 * Convierte un destino de redireccion en una ruta interna segura.
 * Rechaza esquemas externos (javascript:, data:, https:), destinos
 * protocol-relativos (//host) y rutas con backslashes, que el parser de
 * URL normaliza como separadores en esquemas especiales.
 */
export function getSafeInternalRedirect(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  try {
    const base = new URL(INTERNAL_BASE_ORIGIN);
    const url = new URL(raw, base);
    if (url.origin !== base.origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * Valida que un init_point de MercadoPago apunte a un host HTTPS oficial.
 * Devuelve null si no cumple, para que el llamador no navegue.
 */
export function getSafeInitPoint(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    if (!matchesHostSuffix(url.hostname, MERCADO_PAGO_HOST_SUFFIXES)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Sanea una clave de objeto de Supabase Storage: rechaza segmentos de
 * recorrido relativo y separadores de ruta, para que la operacion no pueda
 * escapar del bucket previsto.
 */
export function getSafeStorageKey(raw: string): string | null {
  const key = raw.trim().replace(/\\/g, '/');
  if (key.length === 0) return null;
  if (key.startsWith('/')) return null;
  const segments = key.split('/');
  if (segments.some((segment) => segment === '..' || segment === '.')) return null;
  if (segments.some((segment) => segment.length === 0)) return null;
  return segments.join('/');
}
