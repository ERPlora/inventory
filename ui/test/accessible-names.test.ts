// Every action of Inventory says what it does, in English and in Spanish (inventory#108).
//
// The recording of the functional manual could not find how to receive goods or count stock: the
// row icons were announced as a bare «Recibir» / «Recontar», the product sheet offered neither,
// and an empty Movements list said «Sin movimientos.» and nothing else. A screen reader, the QA
// robot and a new employee all look for an action by its NAME, so the name is the contract.
//
// This walks every surface of the module the way those three do:
//
//   · ROW ACTIONS — every action of every table has a translated name (not the raw key, not
//     empty) in `en` and in `es`. `ok-data-table` turns that name into the icon's `aria-label`
//     and into the entry of the phone's «More actions» menu.
//   · ICON-ONLY BUTTONS — every `ion-button` the module paints without text (modal close «X»,
//     and so on), with every modal of the screen open, carries an `aria-label`.
//   · RECEIVE / COUNT — the two stock actions are named «Receive stock» / «Count stock», they are
//     also on the product sheet as buttons with text, and the empty Movements list points to them
//     BY THOSE SAME NAMES, so renaming the action cannot leave the hint stale.
import { beforeEach, describe, expect, it } from 'vitest';
import en from '../../locales/en.json';
import es from '../../locales/es.json';

type Locale = 'en' | 'es';
const CATALOGS: Record<Locale, Record<string, unknown>> = { en, es };

/** Resolves `ui.key` in ONE language, with no fallback: a key missing there is an empty name. */
function translate(locale: Locale, key: string): string {
  let node: unknown = CATALOGS[locale];
  for (const part of key.split('.')) node = (node as Record<string, unknown> | undefined)?.[part];
  return typeof node === 'string' ? node : '';
}

const PRODUCT = { id: 'p1', name: 'Champú', sku: 'CHA', price: 1200, stock: 3_000_000, unit_code: 'ud', is_active: 1, tax_category_key: 'standard' };
const CATEGORY = { id: 'c1', name: 'Cuidado', product_count: 0 };

function installSdk(locale: Locale, permissions: 'all' | 'read' = 'all'): void {
  (globalThis as Record<string, unknown>).erplora = {
    locale,
    query: async (name: string) => (name === 'inventory.products.list' ? [PRODUCT] : []),
    queryAll: async () => [],
    queryPage: async (name: string) =>
      name === 'inventory.products.list'
        ? { rows: [PRODUCT], total: 1, limit: 50, offset: 0 }
        : name === 'inventory.categories.list'
          ? { rows: [CATEGORY], total: 1, limit: 50, offset: 0 }
          : { rows: [], total: 0, limit: 50, offset: 0 },
    command: async () => ({}),
    hasPermission: () => permissions === 'all',
    currency: 'EUR',
    // The real client always exposes it (module-sdk getter); the list controller needs it for
    // `moneyFilters` (pm#501).
    currencyDecimals: 2,
    formatMoney: (cents: number) => `${((cents || 0) / 100).toFixed(2)} €`,
    formatAmount: (units: number) => `${(units || 0).toFixed(2)} €`,
    t: (_catalog: unknown, key: string) => translate(locale, key),
    loadSlot: async () => [],
  };
}

type Lit = HTMLElement & { updateComplete: Promise<unknown>; shadowRoot: ShadowRoot } & Record<string, unknown>;

async function mount(tag: string): Promise<Lit> {
  await import(`../components/${tag}/${tag}`);
  const el = document.createElement(tag) as Lit;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

/** The accessible name of an `ion-button`: its `aria-label`, or else the text it paints. */
function nameOf(button: Element): string {
  const label = button.getAttribute('aria-label')?.trim();
  if (label) return label;
  const clone = button.cloneNode(true) as Element;
  clone.querySelectorAll('ion-icon, ion-spinner').forEach((n) => n.remove());
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

const SURFACES = ['erp-inventory-products', 'erp-inventory-categories', 'erp-inventory-movements', 'erp-inventory-dashboard'];

beforeEach(() => {
  document.body.innerHTML = '';
});

describe.each(['en', 'es'] as const)('every Inventory action has a name (inventory#108) — %s', (locale) => {
  it.each(['erp-inventory-products', 'erp-inventory-categories'])('%s: every row action is named', async (tag) => {
    installSdk(locale);
    const el = await mount(tag);
    const table = el.shadowRoot.querySelector('ok-data-table') as unknown as { actions: { id: string; label: unknown }[] };
    expect(table.actions.length, 'the table offers row actions').toBeGreaterThan(0);
    for (const action of table.actions) {
      const label = typeof action.label === 'function' ? (action.label as (r: unknown) => string)(PRODUCT) : action.label;
      expect(typeof label === 'string' && label.trim() !== '', `row action «${action.id}» has no ${locale} name`).toBe(true);
      expect(label, `row action «${action.id}» shows its raw i18n key`).not.toMatch(/^ui\./);
    }
  });

  it.each(SURFACES)('%s: no icon-only button is left without a name, with every modal open', async (tag) => {
    installSdk(locale);
    const el = await mount(tag);
    if (tag === 'erp-inventory-products') {
      Object.assign(el, {
        detail: PRODUCT, countTarget: PRODUCT, receiveTarget: PRODUCT, deleteTarget: PRODUCT,
        importOpen: true, importReport: { total: 2, created: 1, skipped: 0, failed: [{ line: 2, sku: 'X', reason: 'duplicate' }] },
      });
    }
    if (tag === 'erp-inventory-categories') Object.assign(el, { deleteTarget: CATEGORY });
    await el.updateComplete;
    const buttons = [...el.shadowRoot.querySelectorAll('ion-button')];
    // Positive control: the two CRUD screens DO paint their own buttons, so an empty walk there
    // would be a broken probe, not a clean screen. Movements and the dashboard paint none today.
    if (tag === 'erp-inventory-products' || tag === 'erp-inventory-categories') {
      expect(buttons.length, `${tag} paints buttons`).toBeGreaterThan(0);
    }
    const unnamed = buttons.filter((b) => nameOf(b) === '' || /^ui\./.test(nameOf(b))).map((b) => b.getAttribute('data-testid') ?? b.outerHTML.slice(0, 120));
    expect(unnamed, `${tag}: buttons without a ${locale} name`).toEqual([]);
  });

  it('receive and count are named for what they do, on the row and on the product sheet', async () => {
    installSdk(locale);
    const el = await mount('erp-inventory-products');
    const table = el.shadowRoot.querySelector('ok-data-table') as unknown as { actions: { id: string; label: string }[] };
    const receive = table.actions.find((a) => a.id === 'receive')?.label;
    const count = table.actions.find((a) => a.id === 'count')?.label;
    expect({ receive, count }).toEqual(
      locale === 'en' ? { receive: 'Receive stock', count: 'Count stock' } : { receive: 'Recibir stock', count: 'Contar stock' },
    );

    Object.assign(el, { detail: PRODUCT });
    await el.updateComplete;
    const onSheet = (id: string) => el.shadowRoot.querySelector(`[data-testid="inventory-products-detail-${id}"]`);
    expect(onSheet('receive'), 'the product sheet offers «receive stock»').not.toBeNull();
    expect(onSheet('count'), 'the product sheet offers «count stock»').not.toBeNull();
    expect(nameOf(onSheet('receive')!)).toBe(receive);
    expect(nameOf(onSheet('count')!)).toBe(count);
  });

  it('the empty Movements list points to receive and count by their names', async () => {
    installSdk(locale);
    const el = await mount('erp-inventory-movements');
    const empty = (el.shadowRoot.querySelector('ok-data-table') as unknown as { emptyMessage: string }).emptyMessage;
    expect(empty).toContain(translate(locale, 'ui.actionReceive'));
    expect(empty).toContain(translate(locale, 'ui.actionCount'));
  });
});

describe('the product sheet opens the same receive / count forms as the row (inventory#108)', () => {
  it.each([
    ['receive', 'receiveTarget'],
    ['count', 'countTarget'],
  ])('«%s» on the sheet closes it and opens that form for the product', async (id, target) => {
    installSdk('en');
    const el = await mount('erp-inventory-products');
    Object.assign(el, { detail: PRODUCT });
    await el.updateComplete;
    (el.shadowRoot.querySelector(`[data-testid="inventory-products-detail-${id}"]`) as HTMLElement).click();
    await el.updateComplete;
    expect(el.detail, 'the sheet closes').toBeNull();
    expect((el[target] as { id: string } | null)?.id, `the ${id} form opens for the product`).toBe('p1');
  });

  // The row path now goes through openReceive/openCount too: each row action opens ITS form, and a
  // count starts empty instead of carrying the figure typed for the previous product.
  it.each([
    ['receive', 'receiveTarget', 'countTarget'],
    ['count', 'countTarget', 'receiveTarget'],
  ])('with permission a «%s» row action opens its own form, and a count starts empty', async (id, target, other) => {
    installSdk('en');
    const el = await mount('erp-inventory-products');
    Object.assign(el, { countValue: '9', countReason: 'previous product' });
    el.shadowRoot.querySelector('ok-data-table')!.dispatchEvent(
      new CustomEvent('rowAction', { detail: { actionId: id, row: PRODUCT }, bubbles: true, composed: true }),
    );
    await el.updateComplete;
    expect((el[target] as { id: string } | null)?.id, `the ${id} form opens for the product`).toBe('p1');
    expect(el[other], `a ${id} does not open the other form`).toBeNull();
    if (id === 'count') expect([el.countValue, el.countReason], 'the count form starts empty').toEqual(['', '']);
  });

  it.each([
    ['receive', 'receiveTarget'],
    ['count', 'countTarget'],
  ])('without permission to adjust stock a «%s» row action opens nothing', async (id, target) => {
    installSdk('en', 'read');
    const el = await mount('erp-inventory-products');
    el.shadowRoot.querySelector('ok-data-table')!.dispatchEvent(
      new CustomEvent('rowAction', { detail: { actionId: id, row: PRODUCT }, bubbles: true, composed: true }),
    );
    await el.updateComplete;
    expect(el[target], `the ${id} form stays closed`).toBeNull();
  });

  it('without permission to adjust stock the sheet offers neither', async () => {
    installSdk('en', 'read');
    const el = await mount('erp-inventory-products');
    Object.assign(el, { detail: PRODUCT });
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('[data-testid="inventory-products-detail-receive"]')).toBeNull();
    expect(el.shadowRoot.querySelector('[data-testid="inventory-products-detail-count"]')).toBeNull();
  });
});
