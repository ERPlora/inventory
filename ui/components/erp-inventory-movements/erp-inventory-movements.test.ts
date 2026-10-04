// Vista «Movimientos» del ledger (inventory#7): historial inmutable, filtrable por
// producto/tipo/fecha/referencia, server-side sobre `inventory.stock.movements`.
import { render } from 'lit';
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
let pageCalls: [string, Record<string, unknown>][] = [];

beforeEach(() => {
  document.body.innerHTML = '';
  optionalCalls = [];
  pageCalls = [];
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    // No invoicing app on this hub: the sale's own number names the document (inventory#137).
    queryOptional: async (name: string, params?: Record<string, unknown>) => {
      optionalCalls.push([name, params]);
      if (name === 'sales.list') return { rows: [{ id: SALE_ID, sale_number: '20261004-0002' }], total: 1, limit: 20, offset: 0 };
      return name === 'sales.get' && params?.sale_id === SALE_ID ? [{ id: SALE_ID, sale_number: '20261004-0002' }] : undefined;
    },
    queryPage: async (name: string, params: Record<string, unknown>) =>
      (pageCalls.push([name, params]), name === 'inventory.stock.movements' && !params.search && !(params.filters as Record<string, unknown> | undefined)?.reference)
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

describe('searching the ticket number finds its movements (inventory#142)', () => {
  it('typing the number the Reference column shows sends its sale to the server search', async () => {
    const el = await montar();
    const table = el.shadowRoot.querySelector('ok-data-table') as HTMLElement;
    pageCalls = [];
    table.dispatchEvent(new CustomEvent('searchChange', { detail: '20261004-0002' }));
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    const searched = pageCalls.filter(([n]) => n === 'inventory.stock.movements').map(([, p]) => p.search);
    expect(searched, 'the uuid stored in the row is what the server search can match').toEqual([SALE_ID]);
  });
});

describe('a search that finds nothing says so (inventory#142)', () => {
  async function emptyAfter(event: string, detail: unknown) {
    const el = await montar();
    const table = el.shadowRoot.querySelector('ok-data-table') as HTMLElement & { emptyMessage: string };
    expect(table.emptyMessage, 'with nothing typed, the ledger is just empty').toBe('ui.mvEmpty');
    table.dispatchEvent(new CustomEvent(event, { detail }));
    for (let i = 0; i < 3; i++) await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    return table.emptyMessage;
  }

  it('a number that names no movement is «nothing matches», not «no movements yet»', async () => {
    expect(await emptyAfter('searchChange', '20261004-0099')).toBe('ui.mvNoMatch');
  });

  it('same for the Reference filter', async () => {
    expect(await emptyAfter('filterChange', { col: 'reference', value: 'ALB-0099' })).toBe('ui.mvNoMatch');
  });
});

describe('on a tablet the reference keeps the end that tells one document from another (inventory#144)', () => {
  // At 820x1180 the Reference column is 76 px and a ticket number asks ~108: clipped at the END,
  // every sale of the day read «20261004-…» and a delivery note «ALB-2026-…». The cell now clips at
  // the START («…04-0002»), keeps the whole number as its title and still unfolds on a tap.
  async function referenceCell(): Promise<HTMLElement> {
    const el = await montar();
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    const table = el.shadowRoot.querySelector('ok-data-table') as unknown as HTMLElement & {
      updateComplete: Promise<unknown>; shadowRoot: ShadowRoot;
    };
    await table.updateComplete;
    const spans = [...table.shadowRoot.querySelectorAll('span')].filter((s) => s.textContent?.trim() === '20261004-0002');
    expect(spans, 'the ticket number is painted once, in one cell').toHaveLength(1);
    return spans[0];
  }

  /** The Reference cell as painted after the next render. */
  async function paintedReference(): Promise<HTMLElement> {
    await new Promise((r) => setTimeout(r, 0));
    const host = document.querySelector('erp-inventory-movements') as HTMLElement & { updateComplete: Promise<unknown>; shadowRoot: ShadowRoot };
    await host.updateComplete;
    const table = host.shadowRoot.querySelector('ok-data-table') as unknown as { updateComplete: Promise<unknown>; shadowRoot: ShadowRoot };
    await table.updateComplete;
    return [...table.shadowRoot.querySelectorAll('span')].find((s) => s.textContent?.trim() === '20261004-0002')!;
  }

  it('the cell clips at its start and keeps the number itself reading left to right', async () => {
    const cell = await referenceCell();
    expect(cell.getAttribute('dir'), 'the overflow (and its «…») goes to the start of the cell').toBe('rtl');
    const number = cell.querySelector('bdi');
    expect(number?.getAttribute('dir'), 'the number is isolated so «-» and digits keep their order').toBe('ltr');
    expect(number?.textContent).toBe('20261004-0002');
    expect(cell.getAttribute('title'), 'hover shows the whole number').toBe('20261004-0002');
  });

  it('a tap on a clipped number unfolds it in place, reading from its start', async () => {
    const cell = await referenceCell();
    Object.defineProperty(cell, 'scrollWidth', { configurable: true, value: 108 });
    Object.defineProperty(cell, 'clientWidth', { configurable: true, value: 76 });
    cell.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true, composed: true }));
    cell.click();
    await new Promise((r) => setTimeout(r, 0));
    const after = await paintedReference();
    expect(after.classList.contains('unfolded'), 'the clipped number unfolds').toBe(true);
    expect(after.getAttribute('dir'), 'unfolded, it wraps from its first digit').not.toBe('rtl');

    // Only the tapped row unfolds: the reference of any other movement stays clipped at its start.
    const host = document.querySelector('erp-inventory-movements')!.shadowRoot!;
    const column = (host.querySelector('ok-data-table') as unknown as { columns: Array<{ key: string; render?: (r: unknown) => unknown }> })
      .columns.find((c) => c.key === 'reference')!;
    const other = document.createElement('div');
    render(column.render!({ ...MOVS[0], id: 'm9', movement_type: 'receipt', reference: 'ALB-2026-000123' }), other);
    const otherCell = other.querySelector('span')!;
    expect(otherCell.classList.contains('unfolded'), 'another row stays folded').toBe(false);
    expect(otherCell.getAttribute('dir')).toBe('rtl');
  });

  it('a mouse click, or a number that fits, changes nothing (hover already shows the title)', async () => {
    const cell = await referenceCell();
    Object.defineProperty(cell, 'scrollWidth', { configurable: true, value: 108 });
    Object.defineProperty(cell, 'clientWidth', { configurable: true, value: 76 });
    cell.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', bubbles: true, composed: true }));
    cell.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(cell.classList.contains('unfolded')).toBe(false);
    expect(cell.getAttribute('dir')).toBe('rtl');

    Object.defineProperty(cell, 'scrollWidth', { configurable: true, value: 76 });
    cell.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true, composed: true }));
    cell.click();
    expect((await paintedReference()).classList.contains('unfolded'), 'a number that fits has nothing to unfold').toBe(false);
  });

  it('a new page folds the numbers a tap unfolded', async () => {
    const cell = await referenceCell();
    Object.defineProperty(cell, 'scrollWidth', { configurable: true, value: 108 });
    Object.defineProperty(cell, 'clientWidth', { configurable: true, value: 76 });
    cell.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true, composed: true }));
    cell.click();
    expect((await paintedReference()).classList.contains('unfolded')).toBe(true);
    const table = document.querySelector('erp-inventory-movements')!.shadowRoot!.querySelector('ok-data-table')!;
    table.dispatchEvent(new CustomEvent('pageChange', { detail: 1 }));
    for (let i = 0; i < 3; i++) await new Promise((r) => setTimeout(r, 0));
    const folded = await paintedReference();
    expect(folded.classList.contains('unfolded')).toBe(false);
    expect(folded.getAttribute('dir')).toBe('rtl');
  });
});

describe('on a tablet an older movement keeps its time (inventory#139)', () => {
  // «12/31/25, 11:45 PM» (an older movement in English) is ~125 px and a tablet gives the Date
  // column ~108: clipped, it read «12/31/25, 11:…». The cell paints the date and the time as two
  // pieces that never break inside and lets the time drop under the date when both do not fit.
  async function dateColumn() {
    const el = await montar();
    const table = el.shadowRoot.querySelector('ok-data-table') as unknown as {
      columns: { key: string; format?: (r: Record<string, unknown>) => string; render?: (r: unknown) => unknown }[];
    };
    return table.columns.find((c) => c.key === 'created_at')!;
  }

  function paint(template: unknown): HTMLElement {
    const host = document.createElement('div');
    render(template, host);
    return host;
  }

  it('the date and the time are unbreakable pieces with a break allowed only between them', async () => {
    const date = await dateColumn();
    expect(date.render, 'the Date column paints its own cell').toBeTypeOf('function');
    const value = new Date(2025, 11, 31, 23, 45).toISOString();
    for (const locale of ['es', 'en']) {
      (globalThis as { erplora: { locale: string } }).erplora.locale = locale;
      const text = date.format!({ created_at: value });
      const cell = paint(date.render!({ ...MOVS[0], created_at: value }));
      const outer = cell.querySelector('[data-testid="inventory-movements-date"]') as HTMLElement;
      expect(outer, 'the cell carries its test hook').not.toBeNull();
      expect(outer.style.whiteSpace, 'the cell may wrap (ok-data-table makes a cell one clipped line)').toBe('normal');
      const pieces = [...outer.querySelectorAll(':scope > span')] as HTMLElement[];
      expect(pieces.map((p) => p.style.whiteSpace)).toEqual(['nowrap', 'nowrap']);
      expect(pieces[1].textContent).toMatch(/^\d{1,2}:\d{2}/);
      expect(outer.textContent?.replace(/\s+/g, ' ').trim(), 'what is painted is what the CSV and the cards print')
        .toBe(text.replace(/\s+/g, ' '));
      expect(outer.getAttribute('title')).toBe(text);
    }
  });

  it('a value that is not a date is painted as it comes, never as an empty cell', async () => {
    const date = await dateColumn();
    expect(paint(date.render!({ ...MOVS[0], created_at: 'not-a-date' })).textContent?.trim()).toBe('not-a-date');
    expect(paint(date.render!({ ...MOVS[0], created_at: null })).textContent?.trim()).toBe('');
  });
});
