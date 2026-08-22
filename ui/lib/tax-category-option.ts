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
//   3. LOS NOMBRES EN INGLÉS — los siembra `taxes` (ADR-0055: el dato nace en el idioma fuente) y su
//      traducción es suya, no de este repo. Cuando se escribió esto, la única traducción vivía
//      DENTRO del Web Component de `taxes` (`ui/lib/tax-category-name.ts`, taxes#30) y desde aquí no
//      se podía alcanzar: un módulo es un repo y un bundle propios, ningún módulo importa el código
//      de otro (ADR-0043) y el catálogo i18n tampoco viaja (`t()` traduce contra el objeto que el
//      propio WC inlinea de sus `locales/*.json`). Copiar su tabla `KEY_TO_LABEL` habría dejado DOS
//      listas de claves canónicas en dos repos: en cuanto `taxes` añadiera una categoría, este
//      desplegable la enseñaría en inglés otra vez, sin error y sin que nadie se entere. Así que se
//      pidió donde tiene dueño y el % se puso delante para que la opción fuera decidible mientras.
//
//      YA ESTÁ SERVIDO (inventory#64). `taxes` sacó la etiqueta de su WC y la puso EN EL CONTRATO
//      (taxes#38, arreglada en taxes#40): `taxes.categories.list` proyecta `display_name`, resuelto
//      al idioma de quien pregunta —override personal → idioma del hub → `es`— contra UNA lista,
//      `taxes_category_label`. Aquí no se decide nada ni se guarda ninguna tabla: se LEE esa
//      columna. Sigue siendo composición por contratos; lo que cambió es que el contrato ya la trae.
//
// Sobre esa etiqueta se mantiene lo de arriba: sin clave técnica y con el % delante, que es el dato
// por el que se elige y lo que evita equivocar una factura.

/** Categoría tal y como la devuelve `taxes.categories.list`. */
export interface TaxCategoryLike {
  key?: string;
  /** El texto CRUDO del seed, en el idioma fuente (inglés). Es la reserva, nunca la preferencia. */
  name?: string;
  /** Etiqueta PRESENTABLE ya resuelta al idioma del hub por `taxes` (taxes#38). Opcional: un hub con
   *  `taxes` anterior a la 2.3.8 no la trae y hay que seguir pintando algo. */
  display_name?: string;
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
 * El nombre VISIBLE de una categoría fiscal: `display_name` y, si no viene, `name` (inventory#64).
 *
 * El orden no es intercambiable. `display_name` es la etiqueta que `taxes` ya resolvió al idioma del
 * hub; `name` es el literal del seed, en inglés. Preferir `name` devolvería el defecto justo cuando
 * la traducción existe. La reserva sí hace falta: contra un hub con `taxes` ≤ 2.3.8 la columna no
 * viaja, y entonces se enseña el inglés —que es lo que se enseñaba antes de esto, así que no
 * empeora— en lugar de una opción muda.
 *
 * Una categoría que creó el dueño del hub no tiene traducción NI la quiere: `taxes` le devuelve su
 * propio texto en `display_name` (el `COALESCE(..., c.name)` de su SQL), así que sale tal cual.
 *
 * Devuelve `''` si no hay ninguno de los dos; quien llama decide la reserva (la `key`).
 */
export function taxCategoryDisplayName(category: TaxCategoryLike): string {
  return (category.display_name || '').trim() || (category.name || '').trim();
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
  const name = taxCategoryDisplayName(category) || key;
  const rate = rates.get(key);
  if (!rate) return name;
  if (rate.exempt) {
    const label = t('ui.taxExempt');
    // Catálogo sin la entrada: devuelve la clave cruda. Mejor el nombre solo que `ui.taxExempt`.
    return label && label !== 'ui.taxExempt' ? `${name} · ${label}` : name;
  }
  return `${name} · ${rate.pct} %`;
}
