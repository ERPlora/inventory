// Contrato de la ETIQUETA del selector «Categoría fiscal» (inventory#58).
//
// El campo del que depende la factura se elegía a ciegas: «Product — reduced (food staples,
// pharmacy) (product.reduced)». Dos defectos distintos y solo uno es de este repo:
//
//   1. LA CLAVE TÉCNICA PEGADA (`(product.reduced)`) la añadía ESTE módulo al componer la opción.
//      Una clave interna no es información para el que da de alta un champú: es ruido que empuja a
//      elegir por descarte. Se quita aquí.
//   2. EL % NO SE VEÍA. La peluquera elige por «21 %» o «10 %», no por una taxonomía. El % vive en
//      `taxes` (regla por país+región+categoría) y se trae por su query PÚBLICA `taxes.rules.list`
//      — la misma que lee el TPV. No se recalcula ni se cablea nada aquí.
//
// El NOMBRE en inglés NO se arregla en este repo: lo siembra `taxes` y su traducción es de `taxes`
// (ver la cabecera de `tax-category-option.ts`).

import { describe, expect, it } from 'vitest';
import { loadTaxRates, taxCategoryOptionLabel, type TaxRate } from './tax-category-option';

/** `t` de mentira: devuelve la clave, que es lo que hace el catálogo cuando le falta la entrada. */
const rawT = (k: string): string => k;
/** `t` con las dos claves que la etiqueta usa de verdad, en español. */
const es = (k: string): string => (k === 'ui.taxExempt' ? 'exento' : k);

const RATES = new Map<string, TaxRate>([
  ['product.generic', { pct: 21, exempt: false }],
  ['product.reduced', { pct: 10, exempt: false }],
  ['service.health', { pct: 0, exempt: true }],
]);

describe('la etiqueta NO enseña la clave técnica (inventory#58)', () => {
  it('quita el sufijo `(product.generic)` que este módulo pegaba', () => {
    const label = taxCategoryOptionLabel(
      { key: 'product.generic', name: 'Product — generic' }, RATES, es,
    );
    expect(label).not.toContain('(product.generic)');
    expect(label).not.toContain('product.generic');
  });

  it('ninguna de las 10 canónicas deja escapar su clave', () => {
    for (const key of ['product.generic', 'product.reduced', 'service.health']) {
      const label = taxCategoryOptionLabel({ key, name: 'X' }, RATES, es);
      expect(label, `${key} filtra su clave`).not.toContain(key);
    }
  });
});

describe('la etiqueta enseña el TIPO aplicable, que es por lo que se elige', () => {
  it('sujeta: nombre + el % de su regla', () => {
    expect(taxCategoryOptionLabel({ key: 'product.generic', name: 'Product — generic' }, RATES, es))
      .toBe('Product — generic · 21 %');
    expect(taxCategoryOptionLabel({ key: 'product.reduced', name: 'Reducido' }, RATES, es))
      .toBe('Reducido · 10 %');
  });

  it('exenta: dice «exento», NUNCA «0 %» (que significa otra cosa)', () => {
    const label = taxCategoryOptionLabel({ key: 'service.health', name: 'Sanitario' }, RATES, es);
    expect(label).toBe('Sanitario · exento');
    expect(label).not.toContain('0 %');
  });

  it('un % con decimales se pinta tal cual, sin inventar redondeos', () => {
    const rates = new Map<string, TaxRate>([['x', { pct: 7.5, exempt: false }]]);
    expect(taxCategoryOptionLabel({ key: 'x', name: 'X' }, rates, es)).toBe('X · 7.5 %');
  });
});

describe('degradación: sin catálogo fiscal la opción sigue siendo elegible', () => {
  it('categoría SIN regla: solo el nombre, sin « · » colgando', () => {
    expect(taxCategoryOptionLabel({ key: 'nueva', name: 'Categoría nueva' }, RATES, es))
      .toBe('Categoría nueva');
  });

  it('mapa vacío (taxes caído): el nombre, nunca una opción muda', () => {
    expect(taxCategoryOptionLabel({ key: 'product.generic', name: 'Generic' }, new Map(), es))
      .toBe('Generic');
  });

  it('sin nombre cae a la clave: una opción sin texto no se puede elegir', () => {
    expect(taxCategoryOptionLabel({ key: 'product.generic', name: '' }, new Map(), es))
      .toBe('product.generic');
  });

  it('si al catálogo i18n le falta la clave, no se cuela `ui.taxExempt` en la pantalla', () => {
    const label = taxCategoryOptionLabel({ key: 'service.health', name: 'Sanitario' }, RATES, rawT);
    expect(label).not.toContain('ui.taxExempt');
  });
});

describe('el % se TRAE de taxes, no se recalcula (inventory#58)', () => {
  function client(rows: unknown) {
    return { queryAll: async (name: string) => (name === 'taxes.rules.list' ? rows : []) };
  }

  it('lee la query pública `taxes.rules.list`', async () => {
    const seen: string[] = [];
    await loadTaxRates({
      queryAll: async (name: string) => { seen.push(name); return []; },
    } as never);
    expect(seen).toContain('taxes.rules.list');
  });

  it('toma la regla RAÍZ de cada categoría (los componentes no son el tipo del artículo)', async () => {
    const rates = await loadTaxRates(client([
      { id: 'r1', tax_category_key: 'product.generic', rate_pct: 21, parent_id: null, valid_from: '2020-01-01' },
      // Recargo de equivalencia: componente de r1. No es el IVA del producto.
      { id: 'c1', tax_category_key: 'product.generic', rate_pct: 5.2, parent_id: 'r1', valid_from: '2020-01-01' },
    ]) as never);
    expect(rates.get('product.generic')?.pct).toBe(21);
  });

  it('con varias raíces vigentes gana la de `valid_from` más reciente (subida de tipo)', async () => {
    const rates = await loadTaxRates(client([
      { id: 'old', tax_category_key: 'product.reduced', rate_pct: 4, parent_id: null, valid_from: '2020-01-01' },
      { id: 'new', tax_category_key: 'product.reduced', rate_pct: 10, parent_id: null, valid_from: '2024-01-01' },
    ]) as never);
    expect(rates.get('product.reduced')?.pct).toBe(10);
  });

  it('marca como exenta la regla cuyo `operation_class` no es `subject`', async () => {
    const rates = await loadTaxRates(client([
      { id: 'e', tax_category_key: 'service.health', rate_pct: 0, parent_id: null, operation_class: 'exempt' },
      { id: 's', tax_category_key: 'product.generic', rate_pct: 21, parent_id: null, operation_class: 'subject' },
    ]) as never);
    expect(rates.get('service.health')?.exempt).toBe(true);
    expect(rates.get('product.generic')?.exempt).toBe(false);
  });

  it('acepta el SOBRE de lista igual que el array pelado (lección de inventory#57)', async () => {
    const rows = [{ id: 'r1', tax_category_key: 'product.generic', rate_pct: 21, parent_id: null }];
    const wrapped = await loadTaxRates(client({ rows, total: 1, limit: 50, offset: 0 }) as never);
    expect(wrapped.get('product.generic')?.pct).toBe(21);
  });

  it('si `taxes` no responde NO lanza: el alta de productos no se cae por un desplegable', async () => {
    const rates = await loadTaxRates({
      queryAll: async () => { throw new Error('taxes caído'); },
    } as never);
    expect(rates.size).toBe(0);
  });
});

// ── inventory#64 ────────────────────────────────────────────────────────────────────────────────
// Lo que la cabecera de arriba daba por imposible («la traducción del nombre se queda donde está su
// dueño y se pide allí») YA ESTÁ PEDIDO Y SERVIDO: taxes#38 sacó la etiqueta del Web Component de
// `taxes` y la puso EN EL CONTRATO — `taxes.categories.list` proyecta `display_name`, ya resuelto al
// idioma de quien pregunta contra UNA lista (`taxes_category_label`). Sigue sin haber una segunda
// tabla de claves en este repo: se lee otra columna, que es exactamente la composición por
// contratos de ADR-0043.
describe('la etiqueta lee `display_name`, la que ya viene traducida (inventory#64)', () => {
  it('canónica: pinta la etiqueta del contrato, NO el inglés del seed', () => {
    const label = taxCategoryOptionLabel(
      { key: 'product.generic', name: 'Product — generic', display_name: 'Producto — general' },
      RATES,
      es,
    );
    expect(label).toBe('Producto — general · 21 %');
    // Ojo con el control: «Producto» CONTIENE «Product». Se comprueba el literal del seed entero.
    expect(label, 'el inglés del seed no puede colarse teniendo traducción')
      .not.toContain('Product — generic');
  });

  it('la que creó el dueño sale TAL CUAL la escribió: esa no se traduce', () => {
    // `taxes` no tiene fila en `taxes_category_label` para una categoría del cliente, así que su
    // propio SQL devuelve `display_name = name`. Aquí no hay nada que decidir: se pinta lo suyo.
    expect(taxCategoryOptionLabel(
      { key: 'salon.tinte', name: 'Tintes de la casa', display_name: 'Tintes de la casa' },
      RATES,
      es,
    )).toBe('Tintes de la casa');
  });

  it('`taxes` anterior a 2.3.8 (sin la columna): cae a `name` — degradar al inglés es lo de hoy', () => {
    expect(taxCategoryOptionLabel(
      { key: 'product.generic', name: 'Product — generic' }, RATES, es,
    )).toBe('Product — generic · 21 %');
  });

  it('nunca al revés: teniendo `display_name`, `name` NO gana', () => {
    for (const cat of [
      { key: 'product.reduced', name: 'Product — reduced', display_name: 'Producto — reducido' },
      { key: 'service.health', name: 'Service — healthcare', display_name: 'Servicio — sanitario' },
    ]) {
      expect(taxCategoryOptionLabel(cat, RATES, es)).toContain(cat.display_name);
      expect(taxCategoryOptionLabel(cat, RATES, es)).not.toContain(cat.name);
    }
  });

  it('un `display_name` en blanco no deja la opción muda: cae a `name`, y sin él a la clave', () => {
    expect(taxCategoryOptionLabel(
      { key: 'product.generic', name: 'Generic', display_name: '   ' }, new Map(), es,
    )).toBe('Generic');
    expect(taxCategoryOptionLabel(
      { key: 'product.generic', name: '', display_name: '' }, new Map(), es,
    )).toBe('product.generic');
  });

  it('el % y el «exento» de inventory#58 siguen intactos sobre la etiqueta traducida', () => {
    expect(taxCategoryOptionLabel(
      { key: 'service.health', name: 'Service — healthcare', display_name: 'Servicio — sanitario' },
      RATES,
      es,
    )).toBe('Servicio — sanitario · exento');
  });
});
