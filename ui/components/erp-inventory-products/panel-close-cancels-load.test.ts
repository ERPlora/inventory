// inventory#109 — closing the product panel while an edit loads cancels that load.
//
// «Edit» on a product row first awaits the FULL product (inventory.products.get) and its
// commercial categories (inventory.product_categories), and only then opens the panel. If the
// panel was already open (another product being edited) and the person closes it meanwhile — the
// X, the backdrop or Escape — the late reply must not reopen the panel nor load the other product
// into the form: closing is «I am done here». ok-data-table ≥0.1.97 emits `panelClose`
// (outfitkit#195) on every open→closed transition; the screen retires the pending opening on it.
// Every tap and every close below goes through the REAL table (its shadow DOM), never a handler
// called by hand.
import { beforeEach, describe, expect, it } from 'vitest';

const ROW_A = { id: 'p1', name: 'Café solo', sku: 'CAF', price: 220, stock: 10_000_000, unit_code: 'ud', is_active: 1, tax_category_key: 'standard' };
const ROW_B = { id: 'p2', name: 'Cortado', sku: 'COR', price: 250, stock: 10_000_000, unit_code: 'ud', is_active: 1, tax_category_key: 'standard' };
const FULL: Record<string, Record<string, unknown>> = {
  p1: { ...ROW_A, description: 'Espresso' },
  p2: { ...ROW_B, description: 'Con leche' },
};
const LINKS = [
  { product_id: 'p1', category_id: 'c1' },
  { product_id: 'p2', category_id: 'c2' },
];

type Query = (name: string, params?: Record<string, unknown>) => Promise<unknown>;
let query: Query;

beforeEach(() => {
  query = async (name, params) => {
    if (name === 'inventory.products.get') return [FULL[String(params?.product_id)]];
    if (name === 'inventory.product_categories') return LINKS;
    return [];
  };
  (globalThis as Record<string, unknown>).erplora = {
    query: (name: string, params?: Record<string, unknown>) => query(name, params),
    queryAll: async (name: string) =>
      name === 'taxes.categories.list' ? [{ id: 't1', key: 'standard', name: 'Standard' }] : [],
    queryPage: async (name: string) =>
      name === 'inventory.products.list'
        ? { rows: [ROW_A, ROW_B], total: 2, limit: 50, offset: 0 }
        : { rows: [], total: 0, limit: 50, offset: 0 },
    command: async () => ({}),
    on: () => () => {},
    hasPermission: () => true,
    locale: 'es',
    currency: 'EUR',
    formatMoney: (cents: number) => `${((cents || 0) / 100).toFixed(2)} €`,
    formatAmount: (units: number) => `${(units || 0).toFixed(2)} €`,
    t: (_catalog: unknown, key: string) => key,
    loadSlot: async () => [],
  };
});

type Table = HTMLElement & { panel: string; shadowRoot: ShadowRoot; updateComplete: Promise<unknown> };
type Screen = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  editingId: string | null;
  newName: string;
  newDescription: string;
  selectedCategoryIds: Set<string>;
};

async function mount(): Promise<Screen> {
  history.replaceState(null, '', '/');
  await import('./erp-inventory-products');
  const el = document.createElement('erp-inventory-products') as Screen;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

const tick = () => new Promise((r) => setTimeout(r, 0));
const table = (el: Screen) => el.shadowRoot.querySelector('ok-data-table') as Table;
const settle = async (el: Screen) => {
  await tick();
  await el.updateComplete;
  await table(el).updateComplete;
  await tick();
  await el.updateComplete;
};
/** The REAL «edit» button the table paints on a product row. */
const editButton = (el: Screen, id: string) =>
  table(el).shadowRoot.querySelector(`[data-testid="inventory-products-table-row-${id}-edit"]`) as HTMLElement;

function hold(): { wait: Promise<void>; release: () => void } {
  let release: () => void = () => {};
  const wait = new Promise<void>((r) => (release = r));
  return { wait, release };
}

const CLOSES: Array<[string, (t: Table) => void]> = [
  ['the X button', (t) => (t.shadowRoot.querySelector('.drawer .dh ion-button') as HTMLElement).click()],
  ['the backdrop', (t) => (t.shadowRoot.querySelector('.tk-scrim') as HTMLElement).click()],
  ['Escape', (t) => t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true }))],
];

/** Opens product A for editing through its real «edit» button and waits until the panel shows it. */
async function editFirstProduct(el: Screen): Promise<void> {
  expect(editButton(el, 'p1'), 'the table paints the «edit» button of the row').toBeTruthy();
  editButton(el, 'p1').click();
  await settle(el);
  expect(table(el).panel, 'positive control: product A is open in the edit panel').toBe('edit');
  expect(el.editingId).toBe('p1');
}

/** With A open, taps «edit» on B (its reads held), then closes the panel the given way. */
async function editSecondThenClose(el: Screen, close: (t: Table) => void): Promise<void> {
  editButton(el, 'p2').click();
  await tick();
  expect(table(el).panel, 'B is still loading: the panel still shows A').toBe('edit');
  close(table(el));
  await table(el).updateComplete;
  expect(table(el).panel, 'the close really closed the panel').toBe('none');
}

describe('closing the product panel while an edit loads cancels the load (inventory#109)', () => {
  it.each(CLOSES)('closed with %s: the late product neither reopens the panel nor fills the form', async (_how, close) => {
    const el = await mount();
    await editFirstProduct(el);
    const gate = hold();
    let reads = 0;
    query = async (name, params) => {
      if (name === 'inventory.product_categories') return LINKS;
      if (name !== 'inventory.products.get') return [];
      reads++;
      await gate.wait;
      return [FULL[String(params?.product_id)]];
    };
    await editSecondThenClose(el, close);
    expect(reads, 'the read of B was in flight when the panel closed').toBe(1);
    gate.release();
    await settle(el);
    expect(table(el).panel, 'the panel stays closed').toBe('none');
    expect(el.editingId, 'a later submit would UPDATE a product the person walked away from').not.toBe('p2');
    expect(el.newName).not.toBe('Cortado');
    expect(el.newDescription).not.toBe('Con leche');
  });

  it('closed with the X while the CATEGORIES of B load: the late reply neither reopens nor fills', async () => {
    const el = await mount();
    await editFirstProduct(el);
    const gate = hold();
    let categoryReads = 0;
    query = async (name, params) => {
      if (name === 'inventory.products.get') return [FULL[String(params?.product_id)]];
      if (name !== 'inventory.product_categories') return [];
      categoryReads++;
      await gate.wait;
      return LINKS;
    };
    editButton(el, 'p2').click();
    await tick();
    await tick();
    expect(categoryReads, 'B is parked on its SECOND read').toBe(1);
    CLOSES[0][1](table(el));
    await table(el).updateComplete;
    expect(table(el).panel).toBe('none');
    gate.release();
    await settle(el);
    expect(table(el).panel, 'the panel stays closed').toBe('none');
    expect(el.editingId).not.toBe('p2');
    expect([...el.selectedCategoryIds]).not.toEqual(['c2']);
  });

  it('positive control: with the panel left OPEN the same slow read does load B', async () => {
    const el = await mount();
    await editFirstProduct(el);
    const gate = hold();
    query = async (name, params) => {
      if (name === 'inventory.product_categories') return LINKS;
      if (name !== 'inventory.products.get') return [];
      await gate.wait;
      return [FULL[String(params?.product_id)]];
    };
    editButton(el, 'p2').click();
    await tick();
    gate.release();
    await settle(el);
    expect(table(el).panel).toBe('edit');
    expect(el.editingId).toBe('p2');
    expect(el.newName).toBe('Cortado');
    expect([...el.selectedCategoryIds]).toEqual(['c2']);
  });
});
