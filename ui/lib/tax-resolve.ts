// Resolución de tipos de IVA para el import CSV (ADR-0066). Helper puro, sin Lit ni DOM, para
// poder reutilizarlo (productos + categorías) y testearlo aislado.
//
// El producto/categoría enlaza el IVA por **referencia** (`tax_rate_id` → `taxes_rate.id`); el %
// vive en `taxes`, no en el producto. Por eso el import:
//   1. lee la columna fiscal de cada fila (varias cabeceras posibles, %, nombre o código),
//   2. matchea contra los tipos ya existentes (por % si es número, o por nombre/código si es texto),
//   3. crea en `taxes` (vía `taxes.rates.bulk_create`) los que falten que traigan un % real,
//   4. devuelve un `Map<valorNormalizado, tax_rate_id>` para enlazar en el bucle de creación.
//
// Solo dependemos de la interfaz `query`/`command` (inyectada): cero acoplamiento al componente.

/** Fila tal y como la devuelve `taxes.rates.list` (vía `query()`, ya desenvuelta a array). */
export interface TaxRateRow {
  id: string;
  code: string;
  name: string;
  country_code: string;
  region_code?: string | null;
  rate_pct: number;
  tax_type?: string;
}

/** Subconjunto del cliente SDK que necesita el resolver (inyectable para tests). */
export interface TaxResolverClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
}

/** Cabeceras (case-insensitive) que se aceptan como "la columna del IVA" en el CSV. */
const TAX_HEADERS = ['tax', 'iva', 'vat', 'tax_rate', 'taxrate', 'impuesto'] as const;

/** Resultado de la resolución: el mapa para enlazar + un resumen para avisar al usuario. */
export interface TaxResolution {
  /** valorNormalizado (ver `normalizeTaxKey`) → `tax_rate_id`. `''` nunca se mapea. */
  map: Map<string, string>;
  /** Nº de tipos creados en `taxes` en esta importación. */
  created: number;
  /** Valores de texto sin % que no se pudieron resolver ni crear (producto queda sin tipo). */
  unresolved: string[];
}

/** Devuelve el valor fiscal crudo de una fila CSV mirando las cabeceras conocidas (1ª no vacía). */
export function pickTaxValue(row: Record<string, string>): string {
  for (const key of Object.keys(row)) {
    if (TAX_HEADERS.includes(key.trim().toLowerCase() as (typeof TAX_HEADERS)[number])) {
      const v = (row[key] ?? '').trim();
      if (v) return v;
    }
  }
  return '';
}

/** Clave normalizada de un valor fiscal: si es %→"21", si es texto→"iva general" (lower+trim). */
export function normalizeTaxKey(value: string): string {
  const pct = parsePct(value);
  if (pct != null) return String(pct);
  return value.trim().toLowerCase();
}

/**
 * Parsea un valor fiscal a porcentaje numérico. Acepta "21", "21%", "21,0", " 10 ".
 * Devuelve `null` si no es un número (p.ej. "IVA General", "exento", "standard").
 */
export function parsePct(value: string): number | null {
  const raw = (value ?? '').trim().replace('%', '').replace(',', '.').trim();
  if (raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** ¿Esta fila existente casa con el valor fiscal? Por % (numérico) o por name/code (texto). */
function rateMatches(rate: TaxRateRow, value: string): boolean {
  const pct = parsePct(value);
  if (pct != null) return Number(rate.rate_pct) === pct;
  const v = value.trim().toLowerCase();
  return (rate.name ?? '').trim().toLowerCase() === v || (rate.code ?? '').trim().toLowerCase() === v;
}

/** País por defecto para tipos nuevos: el `country_code` más frecuente entre los existentes. */
export function inferCountryCode(existing: TaxRateRow[]): string | null {
  const counts = new Map<string, number>();
  for (const r of existing) {
    const cc = (r.country_code ?? '').trim().toUpperCase();
    if (cc) counts.set(cc, (counts.get(cc) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [cc, n] of counts) {
    if (n > bestN) {
      best = cc;
      bestN = n;
    }
  }
  return best;
}

/** Construye el mapa valorNormalizado→id a partir de una lista de tipos y los valores a buscar. */
function buildMap(values: string[], rates: TaxRateRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const value of values) {
    const hit = rates.find((r) => rateMatches(r, value));
    if (hit) map.set(normalizeTaxKey(value), hit.id);
  }
  return map;
}

/**
 * Resuelve (y crea lo que falte) los tipos de IVA referenciados por las filas del CSV.
 * No convierte precios: el "IVA incluido o no" lo gobierna el ajuste del hub/POS, no el import.
 *
 * @param rows   filas crudas del CSV (claves = cabeceras).
 * @param client cliente SDK (`query`/`command`).
 */
export async function resolveTaxRates(
  rows: Record<string, string>[],
  client: TaxResolverClient,
): Promise<TaxResolution> {
  // Valores fiscales distintos presentes en el CSV (no vacíos), preservando el texto original
  // por clave normalizada (para nombrar/derivar code de los que haya que crear).
  const byKey = new Map<string, string>();
  for (const r of rows) {
    const value = pickTaxValue(r);
    if (!value) continue;
    const key = normalizeTaxKey(value);
    if (!byKey.has(key)) byKey.set(key, value);
  }
  if (byKey.size === 0) return { map: new Map(), created: 0, unresolved: [] };

  // (a) Tipos ya existentes. `query()` desenvuelve la página de lista a un array plano.
  const existing = (await client.query<TaxRateRow[]>('taxes.rates.list', { limit: 500 })) ?? [];
  let map = buildMap([...byKey.values()], existing);

  // (b) Sin match → a crear. Solo los que traen un % real: para un nombre sin número no podemos
  // inventar el porcentaje, así que se omiten (el producto quedará sin tipo) y se reportan.
  const country = inferCountryCode(existing) ?? 'ES';
  if (inferCountryCode(existing) == null) {
    console.warn('[inventory] No hay tipos de IVA existentes; uso ES como país por defecto al crearlos.');
  }

  const toCreate: { code: string; name: string; country_code: string; rate_pct: number; tax_type: string }[] = [];
  const unresolved: string[] = [];
  for (const [key, value] of byKey) {
    if (map.has(key)) continue;
    const pct = parsePct(value);
    if (pct == null) {
      unresolved.push(value); // texto sin % y sin match → no se puede crear
      continue;
    }
    // Nombre: si el CSV trae solo el número ("21", "21%") usamos "IVA 21%"; si trae texto
    // con su propio %, respetamos el texto del CSV.
    const bareNumber = value.replace('%', '').replace(',', '.').trim() === String(pct);
    toCreate.push({
      code: `${country.toLowerCase()}-${pct}`,
      name: bareNumber ? `IVA ${pct}%` : value,
      country_code: country,
      rate_pct: pct,
      tax_type: 'vat',
    });
  }

  let created = 0;
  if (toCreate.length > 0) {
    try {
      await client.command('taxes.rates.bulk_create', { rates: toCreate });
      created = toCreate.length;
      // (c) Re-leer para obtener ids fiables y re-mapear (por % o nombre/code, igual que en (b)).
      const refreshed = (await client.query<TaxRateRow[]>('taxes.rates.list', { limit: 500 })) ?? [];
      map = buildMap([...byKey.values()], refreshed);
    } catch (e) {
      console.warn('[inventory] No se pudieron crear tipos de IVA del CSV:', e);
    }
  }

  return { map, created, unresolved };
}
