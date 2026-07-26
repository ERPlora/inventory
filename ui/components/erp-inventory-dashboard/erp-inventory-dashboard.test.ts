// Contrato del DASHBOARD de inventario (inventory#9).
//
// El bug de fondo: el componente esperaba claves que el SQL nunca devolvió
// (`active_products`/`low_stock`/`total_value` vs `products_in_stock`/`products_low_stock`/
// `total_inventory_value`) y trataba la respuesta como OBJETO cuando `query()` devuelve
// FILAS (array) — resultado: todas las KPIs en «—» con el backend contestando bien.
// Además el valor (céntimos) se formateaba con `formatAmount` (no divide) → ×100,
// y la tabla de stock bajo declaraba una columna `price` que la query no proyecta → NaN.
//
// Este test fija el contrato: claves = las del SQL (stats.sql), normalización array→fila,
// dinero SIEMPRE por `formatMoney` (céntimos), estados explícitos y aviso de coste ausente.
import { beforeEach, describe, expect, it } from 'vitest';

const STATS_ROW = {
  total_products: 5,
  products_tracked: 4,
  products_in_stock: 2,
  products_out_of_stock: 2,
  products_low_stock: 3,
  products_without_cost: 1,
  total_inventory_value: 2000, // céntimos → «20.00 €»
};

function stubErplora(overrides: Record<string, unknown> = {}) {
  (globalThis as Record<string, unknown>).erplora = {
    // `query()` devuelve FILAS (array) — el contrato real del cliente.
    query: async (name: string) => (name === 'inventory.products.stats' ? [STATS_ROW] : []),
    queryPage: async () => ({
      rows: [{ id: 'p1', name: 'Vino', sku: 'VIN', stock: 1_000_000, low_stock_threshold: 5_000_000 }],
      total: 1,
      limit: 5,
      offset: 0,
    }),
    command: async () => ({}),
    currency: 'EUR',
    formatMoney: (cents: number) => `${((cents || 0) / 100).toFixed(2)} €`,
    formatAmount: (units: number) => `${(units || 0).toFixed(2)} €`,
    t: (_catalog: unknown, key: string) => key,
    loadSlot: async () => [],
    ...overrides,
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
  stubErplora();
});

async function montar() {
  await import('./erp-inventory-dashboard');
  const el = document.createElement('erp-inventory-dashboard');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

function kpis(el: HTMLElement & { shadowRoot: ShadowRoot }): Map<string, string> {
  const out = new Map<string, string>();
  for (const k of el.shadowRoot.querySelectorAll('ok-kpi')) {
    out.set(k.getAttribute('label') ?? '', k.getAttribute('value') ?? '');
  }
  return out;
}

describe('KPIs del dashboard: contrato SQL↔UI (inventory#9)', () => {
  it('pinta los valores REALES del stats.sql (fila normalizada del array), sin «—»', async () => {
    const el = await montar();
    const k = kpis(el);
    expect(k.get('ui.statsTracked'), 'seguidos').toBe('4');
    expect(k.get('ui.statsInStock'), 'en stock').toBe('2');
    expect(k.get('ui.statsOutOfStock'), 'agotados').toBe('2');
    expect(k.get('ui.statsLowStock'), 'bajo umbral').toBe('3');
    expect([...k.values()]).not.toContain('—');
  });

  it('el valor del inventario (céntimos, a coste) se formatea con formatMoney: 2000 → 20.00 €', async () => {
    const el = await montar();
    expect(kpis(el).get('ui.statsValue')).toBe('20.00 €');
  });

  it('muestra el aviso de productos SIN coste (valor parcial) cuando los hay', async () => {
    const el = await montar();
    const nota = el.shadowRoot.querySelector('ion-note');
    expect(nota, 'falta el aviso de coste ausente').not.toBeNull();
    expect(nota!.textContent).toContain('1');
    expect(nota!.textContent).toContain('ui.statsWithoutCost');
  });

  it('sin productos sin coste NO hay aviso', async () => {
    stubErplora({
      query: async (name: string) =>
        name === 'inventory.products.stats' ? [{ ...STATS_ROW, products_without_cost: 0 }] : [],
    });
    const el = await montar();
    expect(el.shadowRoot.querySelector('ion-note')).toBeNull();
  });

  it('si stats FALLA, el estado de error es explícito (nada de «—» silencioso)', async () => {
    stubErplora({
      query: async () => {
        throw new Error('boom');
      },
    });
    const el = await montar();
    expect(el.shadowRoot.textContent).toContain('ui.statsError');
    expect(el.shadowRoot.querySelectorAll('ok-kpi').length, 'sin KPIs fantasma en error').toBe(0);
  });
});

describe('accionable + tabla de stock bajo', () => {
  it('las KPIs de existencias enlazan a la vista de productos', async () => {
    const el = await montar();
    const links = [...el.shadowRoot.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toContain('/m/inventory/products');
  });

  it('la tabla de stock bajo no declara la columna price (la query no la proyecta → era NaN)', async () => {
    const el = await montar();
    const cols = (el as unknown as { columns: { key: string }[] }).columns;
    expect(cols.map((c) => c.key)).not.toContain('price');
    expect(cols.map((c) => c.key)).toContain('low_stock_threshold');
  });

  it('stock y umbral se pintan en unidades lógicas, no en µ crudos', async () => {
    const el = await montar();
    const cols = (el as unknown as {
      columns: { key: string; format?: (row: Record<string, unknown>) => string }[];
    }).columns;
    expect(cols.find((c) => c.key === 'stock')?.format?.({ stock: 2_500_000 })).toBe('2.5');
    expect(
      cols.find((c) => c.key === 'low_stock_threshold')?.format?.({ low_stock_threshold: 10_000_000 }),
    ).toBe('10');
  });
});
