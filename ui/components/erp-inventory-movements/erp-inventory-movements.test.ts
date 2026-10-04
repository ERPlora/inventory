// Vista «Movimientos» del ledger (inventory#7): historial inmutable, filtrable por
// producto/tipo/fecha/referencia, server-side sobre `inventory.stock.movements`.
import { beforeEach, describe, expect, it } from 'vitest';

const SALE_ID = '3750546f-c61b-4731-a1f2-2a64ec1ce824';

const MOVS = [
  { id: 'm1', product_id: 'p1', product_name: 'Café', sku: 'CAF', movement_type: 'sale',
    qty: -2_500_000, stock_after: 7_500_000, reason: null, reference: SALE_ID, unit_cost: null,
    location_id: 'h1:default', created_by: 'u1', created_at: '2026-07-16T10:00:00+00:00' },
  { id: 'm2', product_id: 'p1', product_name: 'Café', sku: 'CAF', movement_type: 'count',
    qty: 3_000_000, stock_after: 10_000_000, reason: 'recuento', reference: null, unit_cost: null,
    location_id: 'h1:default', created_by: 'u1', created_at: '2026-07-16T09:00:00+00:00' },
];

let optionalCalls: [string, Record<string, unknown> | undefined][] = [];

beforeEach(() => {
  document.body.innerHTML = '';
  optionalCalls = [];
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    // No invoicing app on this hub: the sale's own number names the document (inventory#137).
    queryOptional: async (name: string, params?: Record<string, unknown>) => {
      optionalCalls.push([name, params]);
      return name === 'sales.get' && params?.sale_id === SALE_ID ? [{ id: SALE_ID, sale_number: '20261004-0002' }] : undefined;
    },
    queryPage: async (name: string) =>
      name === 'inventory.stock.movements'
        ? { rows: MOVS, total: 2, limit: 50, offset: 0 }
        : { rows: [], total: 0, limit: 50, offset: 0 },
    command: async () => ({}),
    currency: 'EUR',
    formatMoney: (cents: number) => `${((cents || 0) / 100).toFixed(2)} €`,
    formatAmount: (units: number) => `${(units || 0).toFixed(2)} €`,
    t: (_c: unknown, key: string) => key,
    loadSlot: async () => [],
  };
});

async function montar() {
  await import('./erp-inventory-movements');
  const el = document.createElement('erp-inventory-movements');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

describe('vista Movimientos (inventory#7)', () => {
  it('lista el ledger server-side con las columnas del contrato', async () => {
    const el = await montar();
    const table = el.shadowRoot.querySelector('ok-data-table') as unknown as {
      rows: unknown[]; columns: { key: string }[]; serverSide: boolean;
    };
    expect(table, 'falta la ok-data-table').toBeTruthy();
    expect(table.serverSide).toBe(true);
    expect(table.rows).toHaveLength(2);
    const keys = table.columns.map((c) => c.key);
    for (const k of ['created_at', 'product_name', 'movement_type', 'qty', 'stock_after', 'reason', 'reference']) {
      expect(keys, `falta la columna ${k}`).toContain(k);
    }
  });

  it('el tipo de movimiento es filtrable y se traduce (delta firmado tal cual)', async () => {
    const el = await montar();
    const table = el.shadowRoot.querySelector('ok-data-table') as unknown as {
      columns: { key: string; filterable?: boolean; format?: (r: Record<string, unknown>) => string }[];
    };
    const tipo = table.columns.find((c) => c.key === 'movement_type')!;
    expect(tipo.filterable, 'el tipo debe ser filtrable').toBe(true);
    expect(tipo.format?.({ movement_type: 'sale' }), 'tipo traducido vía catálogo').toBe('ui.mvSale');
    const qty = table.columns.find((c) => c.key === 'qty')!;
    expect(qty.format?.({ qty: -2_500_000 }), 'delta firmado, convertido desde µ').toBe('-2.5');
    expect(qty.format?.({ qty: 3_000_000 }), 'las entradas llevan signo + explícito').toBe('+3');
    const balance = table.columns.find((c) => c.key === 'stock_after')!;
    expect(balance.format?.({ stock_after: 7_500_000 })).toBe('7.5');
  });
});

describe('hallazgos del QA en navegador (07-16)', () => {
  it('la fecha del movimiento se pinta legible, no en ISO crudo', async () => {
    const el = await montar();
    const table = el.shadowRoot.querySelector('ok-data-table') as unknown as {
      columns: { key: string; format?: (r: Record<string, unknown>) => string }[];
    };
    const fecha = table.columns.find((c) => c.key === 'created_at')!;
    const out = fecha.format?.({ created_at: '2026-07-16T10:12:00+00:00' }) ?? '';
    expect(out, 'nada de ISO crudo con offset').not.toContain('T10:12:00+00:00');
    // inventory#130: the year is dropped only for the current one; day, month and time always show.
    expect(out).toMatch(/16\/0?7/);
    expect(out).toMatch(/\d{2}:\d{2}/);
  });
});

describe('the reference of a sale is the number of its ticket (inventory#137)', () => {
  it('a sale movement prints the sale number, not the uuid stored in the row', async () => {
    const el = await montar();
    await new Promise((r) => setTimeout(r, 0));
    const table = el.shadowRoot.querySelector('ok-data-table') as unknown as {
      columns: { key: string; format?: (r: Record<string, unknown>) => string }[];
    };
    const reference = table.columns.find((c) => c.key === 'reference')!;
    expect(reference.format, 'the reference column must format its cell').toBeTypeOf('function');
    expect(reference.format!(MOVS[0])).toBe('20261004-0002');
    expect(reference.format!(MOVS[1]), 'a count has no reference').toBe('');
    expect(optionalCalls.map(([n]) => n), 'one sale on the page, resolved once').toEqual(['invoice.by_source', 'sales.get']);
  });

  it('the table repaints with the number once it is resolved (the cell on screen, not only the formatter)', async () => {
    const el = await montar();
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    const table = el.shadowRoot.querySelector('ok-data-table') as unknown as HTMLElement & {
      updateComplete: Promise<unknown>; shadowRoot: ShadowRoot;
    };
    await table.updateComplete;
    const painted = table.shadowRoot.textContent ?? '';
    expect(painted).toContain('20261004-0002');
    expect(painted).not.toContain(SALE_ID);
  });
});
