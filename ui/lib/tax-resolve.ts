// Resolución de la CATEGORÍA fiscal para el import CSV (ADR-0085, supersede ADR-0066). Helper puro,
// sin Lit ni DOM, reutilizable (productos + categorías) y testeable aislado.
//
// El producto/categoría enlaza el IVA por **categoría fiscal** (`tax_category_key`, p.ej.
// `restaurant.food`); el % vive en `taxes` (reglas por país+región), NO en el producto ni en el CSV.
// Por eso el import NO trae el %: trae un texto de categoría (food/prepared_food/pizza/…). El flujo:
//   1. lee la columna de categoría de cada fila (varias cabeceras posibles),
//   2. normaliza el texto (lower/trim) y lo resuelve por la capa de ALIAS → `taxes.aliases.resolve`,
//   3. si no hay alias, intenta casar el texto con una categoría existente por `key` o por `name`,
//   4. devuelve un `Map<textoNormalizado, tax_category_key>` para enlazar + los **no resueltos**
//      (que la UI debe preguntar: elegir categoría existente / crear nueva), persistiendo el alias.
//
// Solo dependemos de la interfaz `query`/`command` (inyectada): cero acoplamiento al componente.

/** Fila de `taxes.categories.list` (vía `query()`, ya desenvuelta a array). */
export interface TaxCategoryRow {
  id: string;
  key: string;
  name: string;
  is_system?: number;
  is_active?: number;
}

/** Fila de `taxes.aliases.resolve` (`{ tax_category_key }`) — `query()` desenvuelve a array. */
interface AliasResolveRow {
  tax_category_key: string;
}

/** Subconjunto del cliente SDK que necesita el resolver (inyectable para tests). */
export interface TaxResolverClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
}

/** Cabeceras (case-insensitive) que se aceptan como "la columna de categoría fiscal" en el CSV. */
const TAX_HEADERS = [
  'tax_category', 'tax_category_key', 'category_tax', 'fiscal_category',
  'tax', 'iva', 'vat', 'impuesto', 'tax_class',
] as const;

/** Resultado de la resolución: el mapa para enlazar + los valores que la UI debe preguntar. */
export interface TaxResolution {
  /** textoNormalizado (ver `normalizeAlias`) → `tax_category_key`. `''` nunca se mapea. */
  map: Map<string, string>;
  /** Textos de categoría que NO se pudieron resolver (la UI pregunta: elegir/crear + persistir alias). */
  unresolved: string[];
}

/** Devuelve el valor de categoría crudo de una fila CSV mirando las cabeceras conocidas (1ª no vacía). */
export function pickTaxValue(row: Record<string, string>): string {
  for (const key of Object.keys(row)) {
    if (TAX_HEADERS.includes(key.trim().toLowerCase() as (typeof TAX_HEADERS)[number])) {
      const v = (row[key] ?? '').trim();
      if (v) return v;
    }
  }
  return '';
}

/** Alias normalizado de un texto externo: lower + trim + espacios colapsados. */
export function normalizeAlias(value: string): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** ¿El texto casa con una categoría existente, por `key` exacta o por `name` (lower)? */
function categoryMatches(cat: TaxCategoryRow, value: string): string | null {
  const v = normalizeAlias(value);
  if ((cat.key ?? '').toLowerCase() === v) return cat.key;
  if (normalizeAlias(cat.name ?? '') === v) return cat.key;
  return null;
}

/**
 * Resuelve la CATEGORÍA fiscal (`tax_category_key`) referenciada por cada fila del CSV (ADR-0085).
 * NO crea reglas ni inventa porcentajes: el % lo pone `taxes` por país. Solo mapea el texto del CSV
 * a una clave canónica vía alias / categoría existente. Lo que no resuelva se devuelve en
 * `unresolved` para que la UI pregunte (elegir/crear) y persista el alias con `learnAlias`.
 *
 * @param rows   filas crudas del CSV (claves = cabeceras).
 * @param client cliente SDK (`query`/`command`).
 */
export async function resolveTaxCategories(
  rows: Record<string, string>[],
  client: TaxResolverClient,
): Promise<TaxResolution> {
  // Textos de categoría distintos presentes en el CSV (no vacíos), preservando el original por clave.
  const byKey = new Map<string, string>();
  for (const r of rows) {
    const value = pickTaxValue(r);
    if (!value) continue;
    const norm = normalizeAlias(value);
    if (norm && !byKey.has(norm)) byKey.set(norm, value);
  }
  if (byKey.size === 0) return { map: new Map(), unresolved: [] };

  // Categorías existentes (para casar por key/name directamente, sin pasar por alias).
  const categories = (await client.query<TaxCategoryRow[]>('taxes.categories.list', { limit: 500 })) ?? [];

  const map = new Map<string, string>();
  const unresolved: string[] = [];

  for (const [norm, original] of byKey) {
    // 1) ¿casa con una categoría existente por key o nombre?
    let key: string | null = null;
    for (const c of categories) {
      const m = categoryMatches(c, original);
      if (m) { key = m; break; }
    }
    // 2) si no, resuelve por la capa de ALIAS (shipped + learned).
    if (!key) {
      try {
        const rows = (await client.query<AliasResolveRow[]>('taxes.aliases.resolve', { alias: norm })) ?? [];
        const hit = rows[0]?.tax_category_key;
        if (hit) key = hit;
      } catch {
        // resolver tolerante: un fallo de query no rompe el import → cae a unresolved.
      }
    }
    if (key) map.set(norm, key);
    else unresolved.push(original);
  }

  return { map, unresolved };
}

/**
 * Persiste un alias aprendido (texto externo → categoría canónica) tras la decisión del usuario en
 * la UI (ADR-0085): la próxima importación resolverá ese texto sola. Idempotente a nivel de negocio
 * (el índice único por hub+alias evita duplicados); errores se propagan para que la UI avise.
 */
export async function learnAlias(
  client: TaxResolverClient,
  aliasText: string,
  taxCategoryKey: string,
): Promise<void> {
  const alias = normalizeAlias(aliasText);
  if (!alias) return;
  await client.command('taxes.aliases.create', { alias, tax_category_key: taxCategoryKey, source: 'learned' });
}

/**
 * Crea una categoría canónica nueva (cuando el usuario elige "crear" para un texto no resuelto) y
 * aprende el alias en la misma operación. Devuelve la `key` creada. La `key` debe seguir el patrón
 * canónico (`^[a-z][a-z0-9_.]*$`); la UI la propone a partir del texto.
 */
export async function createCategoryWithAlias(
  client: TaxResolverClient,
  key: string,
  name: string,
  aliasText: string,
): Promise<string> {
  await client.command('taxes.categories.create', { key, name });
  await learnAlias(client, aliasText, key);
  return key;
}
