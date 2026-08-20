// tax-category-option — la etiqueta VISIBLE del selector «Categoría fiscal» (inventory#58).
//
// Este es el campo del que depende la factura: decide si el artículo lleva 21 %, 10 %, 4 % o va
// exento. Se ofrecía así:
//
//     Product — reduced (food staples, pharmacy) (product.reduced)
//
// Tres cosas mal, de tres dueños distintos. Conviene no mezclarlas:
//
//   1. LA CLAVE TÉCNICA PEGADA — culpa de ESTE módulo, que componía la opción como
//      `${name} (${key})`. `product.reduced` no es información para quien da de alta un champú: es
//      ruido que obliga a elegir por descarte. Se quita aquí, y es lo que arregla este fichero.
//
//   2. EL % NO SE VEÍA — el vendedor elige por «21 %» o «10 %», no por una taxonomía interna. Es lo
//      que hacen Square, Lightspeed, Odoo y Holded en el alta del artículo. El % NO se cablea ni se
//      recalcula aquí: vive en `taxes` (regla por país+región+categoría+fecha) y se trae por su
//      query PÚBLICA `taxes.rules.list` — la misma lectura que hace el TPV para su preview. Un
//      módulo consume el contrato público de otro; no le copia la regla ni le toca las tablas.
//
//   3. LOS NOMBRES EN INGLÉS — NO son de este repo y aquí no se arreglan. Los siembra `taxes`
//      (ADR-0055: el dato nace en el idioma fuente) y `taxes` ya los traduce EN PRESENTACIÓN sobre
//      la clave canónica, en su `ui/lib/tax-category-name.ts` (taxes#30).
//
//      Ese helper NO se puede reutilizar desde aquí, y no por pereza: un módulo es un repo y un
//      bundle propios, y NINGÚN módulo importa el código de otro (la composición es por contratos —
//      queries, eventos, slots — ADR-0043). El catálogo i18n tampoco viaja: `t()` traduce contra el
//      objeto que el propio WC inlinea de sus `locales/*.json`, y el hub no sirve los de otro módulo.
//      Copiar aquí su tabla `KEY_TO_LABEL` sería tener DOS listas de las claves canónicas en dos
//      repos: en cuanto `taxes` añada una categoría, este desplegable la enseñaría en inglés otra
//      vez, sin error y sin que nadie se entere — exactamente el fallo silencioso de inventory#57.
//      Así que la traducción del nombre se queda donde está su dueño y se pide allí.
//
// Con el % delante, la opción ya es decidible aunque el nombre siga en inglés, que es lo que hace
// falta para no equivocar una factura.

/** Categoría tal y como la devuelve `taxes.categories.list`. */
export interface TaxCategoryLike {
  key?: string;
  name?: string;
}

/** El tipo aplicable a una categoría, ya resuelto desde las reglas de `taxes`. */
export interface TaxRate {
  /** Porcentaje de la regla RAÍZ. `0` cuando la operación no está sujeta o está exenta. */
  pct: number;
  /** La operación no tributa (`operation_class` distinto de `subject`). «exento» ≠ «0 %». */
  exempt: boolean;
}

/** Fila de `taxes.rules.list`. Se declara lo que se lee, nada más. */
interface TaxRuleRow {
  id?: string;
  tax_category_key?: string;
  rate_pct?: number | string;
  parent_id?: string | null;
  valid_from?: string | null;
  operation_class?: string | null;
}

/** Cliente mínimo que necesita el cargador (inyectable en tests). */
export interface TaxRatesClient {
  queryAll<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
}

/** ¿Es la regla RAÍZ de su categoría? Los hijos son componentes (recargo de equivalencia y
 *  similares): suman en la factura, pero NO son «el IVA» que se enseña al elegir la categoría. */
function isRoot(r: TaxRuleRow): boolean {
  return r.parent_id == null || String(r.parent_id) === '';
}

/** Desenvuelve la respuesta venga como array pelado o como sobre `{rows,…}` de una query de lista.
 *  `taxes.rules.list` declara bloque `list`, así que hoy llega el sobre; aceptar las dos formas es
 *  la lección de inventory#57 (leer `.rows` de un array da `undefined` y nadie se entera). */
function rowsOf<T>(r: unknown): T[] {
  if (Array.isArray(r)) return r as T[];
  if (r && typeof r === 'object' && Array.isArray((r as { rows?: T[] }).rows)) {
    return (r as { rows: T[] }).rows;
  }
  return [];
}

/**
 * Trae de `taxes` el tipo aplicable por categoría: `tax_category_key → {pct, exempt}`.
 *
 * Se queda con la regla RAÍZ de cada categoría y, si hay varias, con la de `valid_from` más
 * reciente (una subida de tipo deja la vieja en la tabla). Es la misma lectura pública que hace el
 * TPV; el % REAL de la factura lo resuelve siempre el servidor al completar la venta (ADR-0085),
 * esto es solo para que el desplegable diga por qué se elige una categoría u otra.
 *
 * **Nunca lanza.** Si `taxes` no responde o falta el permiso, devuelve un mapa vacío y las opciones
 * salen con su nombre a secas: un desplegable sin % es peor, pero un alta de productos caída por un
 * desplegable es inaceptable (misma política que `loadTaxCategories`).
 */
export async function loadTaxRates(client: TaxRatesClient): Promise<Map<string, TaxRate>> {
  const out = new Map<string, TaxRate>();
  try {
    const all = rowsOf<TaxRuleRow>(await client.queryAll<TaxRuleRow[]>('taxes.rules.list'));
    const rootByCat = new Map<string, TaxRuleRow>();
    for (const r of all) {
      if (!r || !r.tax_category_key || !isRoot(r)) continue;
      const cat = String(r.tax_category_key);
      const cur = rootByCat.get(cat);
      if (!cur || String(r.valid_from ?? '') > String(cur.valid_from ?? '')) rootByCat.set(cat, r);
    }
    for (const [cat, root] of rootByCat) {
      const cls = String(root.operation_class ?? '') || 'subject';
      out.set(cat, { pct: Number(root.rate_pct) || 0, exempt: cls !== 'subject' });
    }
  } catch {
    /* `taxes` degradado: sin tipos que enseñar, pero el alta sigue viva. */
  }
  return out;
}

/**
 * Texto de una opción del `<ion-select>` de categoría fiscal: **el nombre y su tipo aplicable**,
 * sin la clave técnica.
 *
 *     Product — generic · 21 %
 *     Service — healthcare · exento
 *     Categoría nueva                  (sin regla: solo el nombre, sin « · » colgando)
 *
 * Nunca devuelve vacío teniendo `key`: una opción muda no se puede elegir.
 */
export function taxCategoryOptionLabel(
  category: TaxCategoryLike,
  rates: Map<string, TaxRate>,
  t: (key: string) => string,
): string {
  const key = (category.key || '').trim();
  const name = (category.name || '').trim() || key;
  const rate = rates.get(key);
  if (!rate) return name;
  if (rate.exempt) {
    const label = t('ui.taxExempt');
    // Catálogo sin la entrada: devuelve la clave cruda. Mejor el nombre solo que `ui.taxExempt`.
    return label && label !== 'ui.taxExempt' ? `${name} · ${label}` : name;
  }
  return `${name} · ${rate.pct} %`;
}
