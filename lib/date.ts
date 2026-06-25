export function todayArgentina(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Mendoza',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export function daysAgoArgentina(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Mendoza',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}

/** Convierte una fecha Argentina (YYYY-MM-DD) a rango UTC para queries a la DB.
 *  Argentina usa UTC-3 sin DST, por lo que su día va de 03:00 UTC a 02:59 UTC del día siguiente. */
export function argentinaDayUtcRange(dateStr: string): { start: string; end: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const nextStr = next.toISOString().split('T')[0];
  return {
    start: `${dateStr}T03:00:00`,
    end: `${nextStr}T02:59:59`,
  };
}
