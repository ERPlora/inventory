// The «Price» range filter of Products filters in the unit the column shows (inventory#115, pm#498).
//
// `inventory_product.price` is an INTEGER in the minor unit (cents in EUR, ADR-0123) and the
// dispatcher compares the `range` filter against that integer. The column paints it as money of
// the hub («2,20 €»), so the person types «12» meaning twelve euros — and the screen sent `12` as
// is: «Price from 12» let a 0,12 € product through and «to 5» hid a 2,20 € coffee.
//
// What the table types (major unit) is scaled to the minor unit with the hub's currency decimals
// before the list is asked for, and «Stock» to the 10⁶ scale (ADR-0147). Since pm#501 both are the
// SDK list controller's job (`moneyFilters` / `quantityFilters`, hub#2271), not a local copy: these
// cases are the guardian of that declaration, judged against the real SDK.
import { buildListParams } from '@erplora/module-sdk';
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
    // Judged on what the hub RECEIVES (`buildListParams`, what the real `queryPage` sends): the SDK
    // keeps the unscalable edge until it flattens, and it travels as nothing, never as 0 (pm#501).
    const el = await mount();
    expect(buildListParams({ filters: await type(el, 'price', { from: 'abc' }) })).toEqual({});
    expect(buildListParams({ filters: await type(el, 'price', { to: '   ' }) })).toEqual({});
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

  it('only the money columns are scaled: a range-shaped value on any other column travels as typed', async () => {
    const el = await mount();
    expect(await type(el, 'name', { from: '12' })).toEqual({ name: { from: '12' } });
  });
});

type Table = HTMLElement & {
  open(panel: 'filters'): void;
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  columns: Array<{ key: string; filterable?: boolean; filterType?: string }>;
};

/** The «from» field of one column in the real Filters panel of `ok-data-table`. */
function fromField(table: Table, header: string): HTMLInputElement {
  const label = [...table.shadowRoot.querySelectorAll('.flabel')].find((l) => l.textContent === header);
  return label!.parentElement!.querySelector('ion-input') as unknown as HTMLInputElement;
}

describe('«Stock» range filter compares in the 10⁶ scale the balance is stored in (inventory#83, pm#501)', () => {
  it('«from 2» asks for 2 units (2 000 000 µ), not 2 µ, and does not touch money', async () => {
    const el = await mount();
    expect(await type(el, 'stock', { from: '2' })).toEqual({ stock: { from: 2_000_000 } });
    expect(await type(el, 'sku', '12')).toEqual({ stock: { from: 2_000_000 }, sku: '12' });
  });

  it('a decimal quantity is scaled exactly: «1,5», «1.5» and the panel Number 0.25', async () => {
    const el = await mount();
    expect(await type(el, 'stock', { from: '1,5' })).toEqual({ stock: { from: 1_500_000 } });
    expect(await type(el, 'stock', { from: '1.5' })).toEqual({ stock: { from: 1_500_000 } });
    expect(await type(el, 'stock', { to: 0.25 })).toEqual({ stock: { from: 1_500_000, to: 250_000 } });
  });

  it('the scale does not depend on the currency: a yen hub still asks for 2 000 000 µ', async () => {
    decimals = 0;
    const el = await mount();
    expect(await type(el, 'stock', { from: 2 })).toEqual({ stock: { from: 2_000_000 } });
  });

  it('a NEGATIVE edge is scaled like any number: stock can go below zero, «to -1» asks for −1 000 000 µ', async () => {
    // Selling without stock leaves a negative balance (inventory `allow_sell_without_stock`); «Stock up to
    // −1» is how the person finds what is owed. The old local copy rejected the sign and sent the raw
    // text, so the hub compared against −1 µ: a product at −0,5 units never showed up.
    const el = await mount();
    expect(buildListParams({ filters: await type(el, 'stock', { to: '-1' }) })).toEqual({ f_stock_to: -1_000_000 });
    expect(buildListParams({ filters: await type(el, 'stock', { from: '-2,5' }) })).toEqual({
      f_stock_from: -2_500_000,
      f_stock_to: -1_000_000,
    });
  });

  it('an empty, blank or invalid edge is dropped instead of filtering «from 0» or sending the raw text', async () => {
    // Judged on what the hub RECEIVES (`buildListParams`, what the real `queryPage` sends).
    const el = await mount();
    await type(el, 'stock', { from: 2 });
    expect(await type(el, 'stock', { from: '' })).toEqual({});
    expect(buildListParams({ filters: await type(el, 'stock', { from: 'abc' }) })).toEqual({});
    expect(buildListParams({ filters: await type(el, 'stock', { to: '   ' }) })).toEqual({});
  });

  it('a cleared filter (null) clears it, never a crash', async () => {
    const el = await mount();
    await type(el, 'stock', { from: 2 });
    expect(await type(el, 'stock', null)).toEqual({});
  });

  it('typed in the real Filters panel: asks for µ and the field still shows what was typed', async () => {
    const el = await mount();
    const table = el.shadowRoot.querySelector('ok-data-table') as Table;
    table.open('filters');
    await table.updateComplete;
    fromField(table, 'ui.stock').value = '2';
    fromField(table, 'ui.stock').dispatchEvent(new CustomEvent('ionInput', { bubbles: true, composed: true }));
    await settle(el);
    await table.updateComplete;
    expect(asked[asked.length - 1]).toEqual({ stock: { from: 2_000_000 } });
    expect(String(fromField(table, 'ui.stock').value)).toBe('2');
  });
});

describe('every other filterable column of Products travels untouched (pm#501)', () => {
  it('none is scaled as money or quantity: text as typed, the status through its own two columns', async () => {
    const el = await mount();
    const table = el.shadowRoot.querySelector('ok-data-table') as Table;
    const others = table.columns.filter((c) => c.filterable && !['price', 'stock', 'is_active'].includes(c.key));
    expect(others.map((c) => c.key)).toEqual(['name', 'sku']);
    for (const c of others) {
      for (const value of ['12', { from: '12' }]) {
        const sent = await type(el, c.key, value);
        expect(sent[c.key], c.key).toEqual(value);
        await type(el, c.key, null);
      }
    }
    // «Status» is not a plain column (inventory#38): «No» asks for `is_active=0`, never a scaled value.
    expect(await type(el, 'is_active', '0')).toEqual({ is_active: '0' });
  });
});
