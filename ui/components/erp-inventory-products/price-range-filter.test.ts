// The «Price» range filter of Products filters in the unit the column shows (inventory#115, pm#498).
//
// `inventory_product.price` is an INTEGER in the minor unit (cents in EUR, ADR-0123) and the
// dispatcher compares the `range` filter against that integer. The column paints it as money of
// the hub («2,20 €»), so the person types «12» meaning twelve euros — and the screen sent `12` as
// is: «Price from 12» let a 0,12 € product through and «to 5» hid a 2,20 € coffee.
//
// What the table types (major unit) is scaled to the minor unit with the hub's currency decimals
// before the list is asked for; the edges of every other column travel as before — `stock` keeps
// its own translation to µ (inventory#83), text and status untouched.
import { beforeEach, describe, expect, it } from 'vitest';
import './erp-inventory-products';

/** The `filters` of every page the screen asked the hub for, in call order. */
const asked: Array<Record<string, unknown>> = [];
let decimals = 2;

beforeEach(() => {
  document.body.replaceChildren();
  asked.length = 0;
  decimals = 2;
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryAll: async () => [],
    queryPage: async (name: string, params: { filters?: Record<string, unknown> }) => {
      if (name === 'inventory.products.list') asked.push(structuredClone(params.filters ?? {}));
      return { rows: [], total: 0, limit: 50, offset: 0 };
    },
    command: async () => ({}),
    on: () => () => {},
    hasPermission: () => true,
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
    currency: 'EUR',
    formatMoney: (minor: number) => `MONEY(${minor})`,
    formatAmount: (units: number) => `AMOUNT(${units})`,
    loadSlot: async () => [],
    get currencyDecimals() {
      return decimals;
    },
  };
});

type Mounted = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> };

async function settle(el: Mounted): Promise<void> {
  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
}

async function mount(): Promise<Mounted> {
  const el = document.createElement('erp-inventory-products') as Mounted;
  document.body.appendChild(el);
  await settle(el);
  return el;
}

/** Fires what `ok-data-table` emits when one edge of a filter is typed. */
async function type(el: Mounted, col: string, value: unknown): Promise<Record<string, unknown>> {
  el.shadowRoot
    .querySelector('ok-data-table')!
    .dispatchEvent(new CustomEvent('filterChange', { detail: { col, value } }));
  await settle(el);
  return asked[asked.length - 1];
}

describe('«Price» range filter compares in the unit the column shows (inventory#115)', () => {
  it('«from 12» asks for 12,00 € (1200 cents), not 12 cents', async () => {
    const el = await mount();
    expect(await type(el, 'price', { from: 12 })).toEqual({ price: { from: 1200 } });
  });

  it('«to 5» keeps the other edge and asks for 500 cents, so a 2,20 € coffee is not hidden', async () => {
    const el = await mount();
    await type(el, 'price', { from: 1 });
    expect(await type(el, 'price', { to: 5 })).toEqual({ price: { from: 100, to: 500 } });
  });

  it('a decimal amount is rounded to the minor unit (12.10 → 1210, never 1209)', async () => {
    const el = await mount();
    expect(await type(el, 'price', { from: 12.1 })).toEqual({ price: { from: 1210 } });
    expect(await type(el, 'price', { to: 0.29 })).toEqual({ price: { from: 1210, to: 29 } });
  });

  it('the inline control emits text: «12.5» and «12,5» both mean 12,50 €', async () => {
    const el = await mount();
    expect(await type(el, 'price', { from: '12.5' })).toEqual({ price: { from: 1250 } });
    expect(await type(el, 'price', { from: '12,5' })).toEqual({ price: { from: 1250 } });
  });

  it('uses the scale of the hub currency: 0 decimals (JPY) sends the amount as is, 3 (KWD) ×1000', async () => {
    decimals = 0;
    const jpy = await mount();
    expect(await type(jpy, 'price', { from: 1999 })).toEqual({ price: { from: 1999 } });
    jpy.remove();
    decimals = 3;
    const kwd = await mount();
    expect(await type(kwd, 'price', { from: 1.5 })).toEqual({ price: { from: 1500 } });
  });

  it('clearing an edge drops it instead of filtering «from 0»', async () => {
    const el = await mount();
    await type(el, 'price', { from: 12 });
    await type(el, 'price', { to: 50 });
    expect(await type(el, 'price', { from: '' })).toEqual({ price: { to: 5000 } });
    expect(await type(el, 'price', { to: '' })).toEqual({});
  });

  it('text that is not a number is not turned into «from 0»', async () => {
    const el = await mount();
    expect(await type(el, 'price', { from: 'abc' })).toEqual({});
    expect(await type(el, 'price', { to: '   ' })).toEqual({});
  });

  it('a cleared filter (null) clears it, never a crash', async () => {
    const el = await mount();
    await type(el, 'price', { from: 12 });
    expect(await type(el, 'price', null)).toEqual({});
  });

  it('typed in the real Filters panel: asks for cents and the field still shows what was typed', async () => {
    const el = await mount();
    type Table = HTMLElement & { open(panel: 'filters'): void; shadowRoot: ShadowRoot; updateComplete: Promise<unknown> };
    const table = el.shadowRoot.querySelector('ok-data-table') as Table;
    table.open('filters');
    await table.updateComplete;
    const fromOfPrice = (): HTMLInputElement => {
      const label = [...table.shadowRoot.querySelectorAll('.flabel')].find((l) => l.textContent === 'ui.price');
      return label!.parentElement!.querySelector('ion-input') as unknown as HTMLInputElement;
    };
    fromOfPrice().value = '12';
    fromOfPrice().dispatchEvent(new CustomEvent('ionInput', { bubbles: true, composed: true }));
    await settle(el);
    await table.updateComplete;
    expect(asked[asked.length - 1]).toEqual({ price: { from: 1200 } });
    // The cents only travel to the hub: the field keeps «12», never «1200».
    expect(String(fromOfPrice().value)).toBe('12');
  });

  it('other columns travel as before: stock in µ (not money), text as typed', async () => {
    const el = await mount();
    expect(await type(el, 'stock', { from: '2' })).toEqual({ stock: { from: 2_000_000 } });
    expect(await type(el, 'sku', '12')).toEqual({ stock: { from: 2_000_000 }, sku: '12' });
  });

  it('only the money columns are scaled: a range-shaped value on any other column travels as typed', async () => {
    // Today no other column of Products emits a range besides `stock` (handled above); this pins
    // that the scaling is keyed by the money columns and not applied to whatever shape arrives.
    const el = await mount();
    expect(await type(el, 'name', { from: '12' })).toEqual({ name: { from: '12' } });
  });
});
