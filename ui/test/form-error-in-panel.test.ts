// pm#478 (out of staff#72) — on a phone, a refused save in Inventory showed NOTHING: the person
// pressed «Save» and the screen stayed as it was.
//
// The refusal did arrive; it was painted in the wrong place. The product and category forms live
// in the `create` panel of their `ok-data-table`, and under 834 px that panel is a FULL-SCREEN
// sheet (`position: fixed; inset: 0; z-index: 1000`, outfitkit#75). The error banner was a child of
// the PAGE, so on a phone it sat under the sheet, out of sight. On a desktop the panel sits beside
// the table and the banner happened to be visible, which is why only mobile saw it.
//
// The rule this file fixes, for both screens (products, categories) — the same one Personal
// (staff#75), Customers (customers#97) and Services (services#115) follow:
//
//   · what goes wrong while SAVING the panel's form is painted INSIDE that form, next to the button
//     that was pressed, and scrolled into view — it travels with the panel whatever the width;
//   · what goes wrong in a ROW action (delete confirmed on the page, the «active» switch of a row)
//     stays on the PAGE: no panel is open then, and a message inside a closed panel is invisible;
//   · a later save that works clears the page refusal too: it is the next thing the person did.
//
// Products has two more forms of its own — stock COUNT and goods RECEIPT — each in a modal that
// covers the page at every width. Their refusal used to share the page banner, so it was never
// seen either; it now lives inside the modal that was submitted.
//
// It is what Square, Shopify and Odoo do in their side/sheet forms: the error of a submit lives in
// the form that was submitted.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const PRODUCT = {
  id: 'p1', name: 'Café', sku: 'CAF', price: 120, cost: 0, stock: 5_000_000,
  low_stock_threshold: 10_000_000, tax_category_key: 'standard', unit_code: 'ud', is_active: 1,
};
const CATEGORY = { id: 'c1', name: 'Bebidas', slug: 'bebidas', tax_category_key: null, product_count: 0 };

let refusal: Error | null = null;
/** Every element the component scrolled into view AFTER it had painted itself, in order. Scrolling a
 *  banner that has not rendered yet measures a 0-px box: the sheet stops with the banner still half
 *  under the tab bar (seen in the staff#72 bench at 390 px). */
let revealed: Element[] = [];

beforeEach(() => {
  document.body.replaceChildren();
  refusal = null;
  revealed = [];
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(function (this: HTMLElement) {
    if ((this as HTMLElement & { hasUpdated?: boolean }).hasUpdated !== false) revealed.push(this);
  });
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => (name === 'inventory.products.get' ? [PRODUCT] : []),
    queryOptional: async () => undefined,
    queryAll: async () => [],
    queryPage: async () => ({ rows: [], total: 0, limit: 50, offset: 0 }),
    command: async () => {
      if (refusal) throw refusal;
      return {};
    },
    on: () => () => {},
    hasPermission: () => true,
    locale: 'es',
    currency: 'EUR',
    currencyDecimals: 2,
    formatMoney: (minor: number) => `${(Number(minor || 0) / 100).toFixed(2)} €`,
    formatAmount: (units: number) => String(units),
    loadSlot: async () => [],
    t: (_c: unknown, key: string) => key,
  };
});

type Wc = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> } & Record<string, any>;

async function mount(tag: string, path: string): Promise<Wc> {
  await import(path);
  const el = document.createElement(tag) as Wc;
  document.body.appendChild(el);
  await settle(el);
  return el;
}

async function settle(el: Wc): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
  }
}

const submitEvent = (): Event => new Event('submit', { cancelable: true });
const rowAction = (actionId: string, row: object): CustomEvent =>
  new CustomEvent('rowAction', { detail: { actionId, row } });

/** The error banner INSIDE the panel's form, or null. */
const inForm = (el: Wc, testid: string): Element | null =>
  el.shadowRoot.querySelector(`form[slot="create"] [data-testid="${testid}"]`);

/** The banner inside the form AND scrolled into view: pressing the button at the foot of a long
 *  form, the banner that appears above it is pushed half off a phone screen otherwise. */
const inFormAndRevealed = (el: Wc, testid: string): Element | null => {
  const banner = inForm(el, testid);
  return banner && revealed.includes(banner) ? banner : null;
};

/** The error banner on the PAGE (outside the panel and outside every modal), or null. */
const onPage = (el: Wc, testid: string): Element | null => {
  const banner = el.shadowRoot.querySelector(`[data-testid="${testid}"]`);
  return banner && !banner.closest('form[slot="create"]') && !banner.closest('ion-modal') ? banner : null;
};

/** How each screen is driven: fill a valid new row, save it, and ask for / confirm the delete. */
interface Screen {
  surface: string;
  tag: string;
  path: string;
  row: Record<string, unknown>;
  fill: (el: Wc) => void;
  save: (el: Wc) => Promise<void>;
}

const PRODUCTS = '../components/erp-inventory-products/erp-inventory-products';
const CATEGORIES = '../components/erp-inventory-categories/erp-inventory-categories';

const SCREENS: Screen[] = [
  {
    surface: 'inventory-products',
    tag: 'erp-inventory-products',
    path: PRODUCTS,
    row: PRODUCT,
    fill: (el) => { el.newName = 'Té'; el.newSku = 'TE'; el.newTaxCategoryKey = 'standard'; },
    save: (el) => el.createProduct(submitEvent()),
  },
  {
    surface: 'inventory-categories',
    tag: 'erp-inventory-categories',
    path: CATEGORIES,
    row: CATEGORY,
    fill: (el) => { el.newName = 'Comida'; },
    save: (el) => el.create(submitEvent()),
  },
];

/** A delete the server refuses, confirmed on the page. */
async function refusedDelete(el: Wc, s: Screen): Promise<void> {
  await el.onRowAction(rowAction('delete', s.row));
  refusal = new Error('in use');
  await el.confirmDelete();
  await settle(el);
}

describe.each(SCREENS)('pm#478 · $surface: save refusal in the form, row refusal on the page', (s) => {
  const formError = `${s.surface}-form-error`;
  const pageError = `${s.surface}-page-error`;

  it('a refused «Save» of a new row lands in the form and is scrolled into view', async () => {
    const el = await mount(s.tag, s.path);
    s.fill(el);
    refusal = new Error('rejected');
    await s.save(el);
    await settle(el);
    const banner = inForm(el, formError);
    expect(banner, 'on a phone the panel covers the page: the refusal has to travel with the form').not.toBeNull();
    expect(inFormAndRevealed(el, formError), 'and it is scrolled into view').not.toBeNull();
    expect(banner?.textContent?.trim()).toBe('rejected');
    expect(banner?.nextElementSibling?.getAttribute('data-testid'), 'right above the button that was pressed').toBe(`${s.surface}-submit`);
    expect(onPage(el, pageError), 'the page under the sheet shows nothing').toBeNull();
    expect(onPage(el, formError), 'the old page banner is gone').toBeNull();
  });

  it('a refused «Save» of an edited row lands in the form too', async () => {
    const el = await mount(s.tag, s.path);
    await el.onRowAction(rowAction('edit', s.row));
    await settle(el);
    refusal = new Error('rejected');
    await s.save(el);
    await settle(el);
    expect(inFormAndRevealed(el, formError)).not.toBeNull();
  });

  it('a new attempt clears the previous refusal of the form', async () => {
    const el = await mount(s.tag, s.path);
    s.fill(el);
    refusal = new Error('rejected');
    await s.save(el);
    refusal = null;
    s.fill(el);
    await s.save(el);
    await settle(el);
    expect(inForm(el, formError)).toBeNull();
  });

  it('opening a row to edit after a refused save does not carry that refusal into its form', async () => {
    const el = await mount(s.tag, s.path);
    s.fill(el);
    refusal = new Error('rejected');
    await s.save(el);
    refusal = null;
    await el.onRowAction(rowAction('edit', s.row));
    await settle(el);
    expect(inForm(el, formError)).toBeNull();
  });

  it('a refused delete (confirmed on the page, no panel open) is shown on the page', async () => {
    const el = await mount(s.tag, s.path);
    await refusedDelete(el, s);
    const banner = onPage(el, pageError);
    expect(banner, 'no panel is open: inside the form it would be invisible').not.toBeNull();
    expect(banner?.textContent?.trim()).toBe('in use');
    expect(inForm(el, formError)).toBeNull();
  });

  it('the page error of a refused delete goes away once a later save succeeds', async () => {
    const el = await mount(s.tag, s.path);
    await refusedDelete(el, s);
    refusal = null;
    s.fill(el);
    await s.save(el);
    await settle(el);
    expect(onPage(el, pageError), 'a stale refusal must not stay red after a save that worked').toBeNull();
  });

  it('the page error of a refused delete goes away once a later EDIT save succeeds', async () => {
    const el = await mount(s.tag, s.path);
    await refusedDelete(el, s);
    refusal = null;
    await el.onRowAction(rowAction('edit', s.row));
    await settle(el);
    await s.save(el);
    await settle(el);
    expect(onPage(el, pageError), 'saving an edit is a save too: the stale refusal goes').toBeNull();
  });

  it('asking for the delete again hides the previous refusal until the new answer arrives', async () => {
    const el = await mount(s.tag, s.path);
    await refusedDelete(el, s);
    refusal = null;
    await el.onRowAction(rowAction('delete', s.row));
    await settle(el);
    expect(onPage(el, pageError)).toBeNull();
  });

  it('opening the panel after a refused delete does not carry that page error into the form', async () => {
    const el = await mount(s.tag, s.path);
    await refusedDelete(el, s);
    await el.onRowAction(rowAction('edit', s.row));
    await settle(el);
    expect(inForm(el, formError)).toBeNull();
  });
});

describe('pm#478 · products: refusals the screen itself raises before calling the server', () => {
  it('«tax category required» is said inside the form, scrolled into view', async () => {
    const el = await mount('erp-inventory-products', PRODUCTS);
    el.newName = 'Té';
    el.newSku = 'TE';
    el.newTaxCategoryKey = '';
    await el.createProduct(submitEvent());
    await settle(el);
    expect(inFormAndRevealed(el, 'inventory-products-form-error')?.textContent?.trim()).toBe('ui.errTaxCategoryRequired');
  });

  it('a stock threshold that is not a quantity is said inside the form too', async () => {
    const el = await mount('erp-inventory-products', PRODUCTS);
    el.newName = 'Té';
    el.newSku = 'TE';
    el.newTaxCategoryKey = 'standard';
    el.newThreshold = 'abc';
    await el.createProduct(submitEvent());
    await settle(el);
    expect(inFormAndRevealed(el, 'inventory-products-form-error')?.textContent?.trim()).toBe('ui.errQuantity');
  });
});

describe('pm#478 · products: a refused «active» switch of a row', () => {
  const toggle = (el: Wc, checked: boolean): Promise<void> =>
    el.toggleActive(PRODUCT, { target: { checked } } as unknown as Event);

  it('is shown on the page, not in the (closed) form', async () => {
    const el = await mount('erp-inventory-products', PRODUCTS);
    refusal = new Error('locked');
    await toggle(el, false);
    await settle(el);
    expect(onPage(el, 'inventory-products-page-error')?.textContent?.trim()).toBe('locked');
    expect(inForm(el, 'inventory-products-form-error')).toBeNull();
  });

  it('goes away when the next switch works', async () => {
    const el = await mount('erp-inventory-products', PRODUCTS);
    refusal = new Error('locked');
    await toggle(el, false);
    refusal = null;
    await toggle(el, false);
    await settle(el);
    expect(onPage(el, 'inventory-products-page-error')).toBeNull();
  });
});

describe('pm#478 · products: stock count and goods receipt say their refusal inside their modal', () => {
  /** The banner inside the open ion-modal that holds `field`, or null. */
  const inModalOf = (el: Wc, field: string, testid: string): Element | null => {
    const modal = el.shadowRoot.querySelector(`[data-testid="${field}"]`)?.closest('ion-modal');
    return modal?.querySelector(`[data-testid="${testid}"]`) ?? null;
  };

  /** Right above the modal's button, spaced like the fields around it. The modal is reparented to
   *  <body> and loses the component's CSS, so the spacing has to come from Ionic's own class. */
  const expectAboveButton = (banner: Element | null, submit: string): void => {
    expect(banner?.nextElementSibling?.getAttribute('data-testid')).toBe(submit);
    expect(banner?.classList.contains('ion-margin-top'), 'not glued to the field above').toBe(true);
  };

  /** A unit counted in whole units: 2.5 is off its grid. */
  const UNIT = { code: 'ud', increment_value: 1_000_000, name: 'Unit', name_es: 'Unidad' };

  /** Holds the next command in flight until `release()`, so the screen can be looked at meanwhile. */
  function holdNextCommand(): { release: () => void } {
    let release = (): void => {};
    const gate = new Promise<void>((r) => { release = r; });
    const client = (globalThis as Record<string, any>).erplora;
    const original = client.command;
    client.command = async () => {
      client.command = original;
      await gate;
      return {};
    };
    return { release };
  }

  async function refusedCount(el: Wc): Promise<void> {
    await el.onRowAction(rowAction('count', PRODUCT));
    el.countValue = '3';
    el.countReason = 'broken';
    refusal = new Error('count refused');
    await el.submitCount();
    await settle(el);
  }

  async function refusedReceive(el: Wc): Promise<void> {
    await el.onRowAction(rowAction('receive', PRODUCT));
    el.receiveQty = '2';
    refusal = new Error('receipt refused');
    await el.submitReceive();
    await settle(el);
  }

  it('a refused count is shown in the count modal, not on the page nor in the create form', async () => {
    const el = await mount('erp-inventory-products', PRODUCTS);
    await refusedCount(el);
    expect(el.countTarget, 'the modal stays open with what was typed').not.toBeNull();
    const banner = inModalOf(el, 'inventory-products-count-qty', 'inventory-products-count-error');
    expect(banner?.textContent?.trim()).toBe('count refused');
    expectAboveButton(banner, 'inventory-products-count-submit');
    expect(onPage(el, 'inventory-products-page-error')).toBeNull();
    expect(inForm(el, 'inventory-products-form-error')).toBeNull();
  });

  it('a count that is not a number is said in the count modal too', async () => {
    const el = await mount('erp-inventory-products', PRODUCTS);
    await el.onRowAction(rowAction('count', PRODUCT));
    el.countValue = 'abc';
    el.countReason = 'broken';
    await el.submitCount();
    await settle(el);
    expect(inModalOf(el, 'inventory-products-count-qty', 'inventory-products-count-error')?.textContent?.trim()).toBe('ui.errQuantity');
  });

  it('a count off the grid of the unit is said in the count modal too', async () => {
    const el = await mount('erp-inventory-products', PRODUCTS);
    el.units = [UNIT];
    await el.onRowAction(rowAction('count', PRODUCT));
    el.countValue = '2.5';
    el.countReason = 'broken';
    await el.submitCount();
    await settle(el);
    expect(inModalOf(el, 'inventory-products-count-qty', 'inventory-products-count-error')?.textContent?.trim()).toBe('ui.errQuantityGrid');
  });

  it('a refused receipt is shown in the receipt modal, not on the page nor in the create form', async () => {
    const el = await mount('erp-inventory-products', PRODUCTS);
    await refusedReceive(el);
    expect(el.receiveTarget, 'the modal stays open with what was typed').not.toBeNull();
    const banner = inModalOf(el, 'inventory-products-receive-qty', 'inventory-products-receive-error');
    expect(banner?.textContent?.trim()).toBe('receipt refused');
    expectAboveButton(banner, 'inventory-products-receive-submit');
    expect(onPage(el, 'inventory-products-page-error')).toBeNull();
    expect(inForm(el, 'inventory-products-form-error')).toBeNull();
  });

  it('a receipt quantity that is not valid is said in the receipt modal too', async () => {
    const el = await mount('erp-inventory-products', PRODUCTS);
    await el.onRowAction(rowAction('receive', PRODUCT));
    el.receiveQty = '-1';
    await el.submitReceive();
    await settle(el);
    expect(inModalOf(el, 'inventory-products-receive-qty', 'inventory-products-receive-error')?.textContent?.trim()).toBe('ui.errQuantity');
  });

  it('a receipt off the grid of the unit is said in the receipt modal too', async () => {
    const el = await mount('erp-inventory-products', PRODUCTS);
    el.units = [UNIT];
    await el.onRowAction(rowAction('receive', PRODUCT));
    el.receiveQty = '2.5';
    await el.submitReceive();
    await settle(el);
    expect(inModalOf(el, 'inventory-products-receive-qty', 'inventory-products-receive-error')?.textContent?.trim()).toBe('ui.errQuantityGrid');
  });

  it('a new count attempt hides the previous refusal while it is being sent', async () => {
    const el = await mount('erp-inventory-products', PRODUCTS);
    await refusedCount(el);
    const sent = holdNextCommand();
    const attempt = el.submitCount();
    await settle(el);
    expect(inModalOf(el, 'inventory-products-count-qty', 'inventory-products-count-error'), 'an old «no» next to a new try reads as the answer to it').toBeNull();
    sent.release();
    await attempt;
  });

  it('a new receipt attempt hides the previous refusal while it is being sent', async () => {
    const el = await mount('erp-inventory-products', PRODUCTS);
    await refusedReceive(el);
    const sent = holdNextCommand();
    const attempt = el.submitReceive();
    await settle(el);
    expect(inModalOf(el, 'inventory-products-receive-qty', 'inventory-products-receive-error')).toBeNull();
    sent.release();
    await attempt;
  });

  it('a refused count does not follow the person into the receipt modal of another product', async () => {
    const el = await mount('erp-inventory-products', PRODUCTS);
    await refusedCount(el);
    el.countTarget = null;
    await el.onRowAction(rowAction('receive', PRODUCT));
    await settle(el);
    expect(inModalOf(el, 'inventory-products-receive-qty', 'inventory-products-receive-error')).toBeNull();
  });

  it('reopening the count after a refusal starts clean', async () => {
    const el = await mount('erp-inventory-products', PRODUCTS);
    await refusedCount(el);
    el.countTarget = null;
    refusal = null;
    await el.onRowAction(rowAction('count', PRODUCT));
    await settle(el);
    expect(inModalOf(el, 'inventory-products-count-qty', 'inventory-products-count-error')).toBeNull();
  });

  it('reopening the receipt after a refusal starts clean', async () => {
    const el = await mount('erp-inventory-products', PRODUCTS);
    await refusedReceive(el);
    el.receiveTarget = null;
    refusal = null;
    await el.onRowAction(rowAction('receive', PRODUCT));
    await settle(el);
    expect(inModalOf(el, 'inventory-products-receive-qty', 'inventory-products-receive-error')).toBeNull();
  });
});
