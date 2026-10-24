/**
 * Phone validation for Mendoza (Argentina).
 *
 * A local number is `261 + 7 digits` (e.g. "2614953456"). Users type it in
 * many shapes, so all of these are accepted and normalized:
 *
 *   2614953456            → 2614953456
 *   0261 495-3456         → 2614953456   (domestic long distance)
 *   +54 9 261 495-3456    → 2614953456   (WhatsApp style, +54 9)
 *   5492614953456         → 2614953456
 *   9 261 4953456         → 2614953456
 *   +54 2634 45-1234      → 2634451234   (San Rafael / General Alvear)
 */

/** Mendoza area codes with their subscriber digit counts. */
const MENDOZA_AREA_CODES: { code: string; digits: number }[] = [
  { code: '261', digits: 7 },   // Gran Mendoza
  { code: '2634', digits: 6 },  // San Rafael / General Alvear
];

export interface PhoneValidation {
  valid: boolean;
  /** Digits-only canonical form, e.g. "2614953456". null when invalid. */
  normalized: string | null;
  /** Human-friendly form, e.g. "261 495-3456". null when invalid. */
  formatted: string | null;
}

/** Strip prefix artefacts (country code, long-distance 0, mobile 9). */
function toNationalDigits(raw: string): string {
  let d = raw.replace(/\D/g, '');
  // +54 / 54 country code (12+ digits national side, e.g. 549261... or 54261...)
  if (d.startsWith('54') && d.length >= 12) d = d.slice(2);
  // Domestic long-distance prefix
  if (d.startsWith('0')) d = d.slice(1);
  // Mobile prefix after country code
  if (d.startsWith('9') && d.length === 11) d = d.slice(1);
  return d;
}

export function validateMendozaPhone(raw: string | undefined | null): PhoneValidation {
  if (!raw) return { valid: false, normalized: null, formatted: null };

  const d = toNationalDigits(raw);
  for (const { code, digits } of MENDOZA_AREA_CODES) {
    if (d.startsWith(code) && d.length === code.length + digits) {
      const subscriber = d.slice(code.length);
      return {
        valid: true,
        normalized: d,
        formatted:
          code.length === 3
            ? `${code} ${subscriber.slice(0, 3)}-${subscriber.slice(3)}`
            : `${code} ${subscriber.slice(0, 2)}-${subscriber.slice(2)}`,
      };
    }
  }
  return { valid: false, normalized: null, formatted: null };
}

/** User-facing error message for an invalid phone number. */
export const PHONE_ERROR_MESSAGE =
  'Teléfono inválido. Ingresá un número de Mendoza, por ejemplo 261 495-3456.';
