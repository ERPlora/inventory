// A list that could not load must not read «No …» + «0 records» (pm#533, hub#2328).
//
// The shell's `<ok-data-table>` (OutfitKit ≥ 0.1.113) paints a failed load itself: «could not
// load», the reason and a Retry button. Each inventory list (products, categories, movements and the
// low-stock table of the dashboard) hands it its controller's `error` and reloads on its `retry`
// event — and drops its own red banner, which would say the same thing twice. But a module paints
// with the SHELL's OutfitKit (ADR-0451): on a hub whose table has no `error` property the banner is
// the only place the reason is shown, so it stays.
//
// The shell's table is stood in for by a bare element registered BEFORE the screens load (as the
// shell does at boot; the screens' own `define()` then loses, like in the hub). Its `error`
// property is added or removed per test, which is exactly what `dataTableShowsLoadError()` reads.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

class ShellTable extends HTMLElement {}
const errors = new WeakMap<HTMLElement, unknown>();

function shellTableKnowsErrors(yes: boolean) {
  if (yes) {
    Object.defineProperty(ShellTable.prototype, 'error', {
      configurable: true,
      get(this: HTMLElement) { return errors.get(this) ?? ''; },
      set(this: HTMLElement, v: unknown) { errors.set(this, v); },
    });
  } else {
    delete (ShellTable.prototype as { error?: unknown }).error;
  }
}

const SCREENS = [
  { tag: 'erp-inventory-products', list: 'inventory.products.list', table: 'inventory-products-table', banner: 'inventory-products-load-error' },
  { tag: 'erp-inventory-categories', list: 'inventory.categories.list', table: 'inventory-categories-table', banner: 'inventory-categories-load-error' },
  { tag: 'erp-inventory-movements', list: 'inventory.stock.movements', table: 'inventory-movements-table', banner: 'inventory-movements-load-error' },
  { tag: 'erp-inventory-dashboard', list: 'inventory.products.low_stock', table: 'inventory-dashboard-low-stock-table', banner: 'inventory-dashboard-load-error' },
] as const;

const REASON = 'The hub is not responding.';
const ROW = { id: 'r1', name: 'Café', sku: 'CAF', price: 120, cost: 0, stock: 5_000_000, low_stock_threshold: 10_000_000, is_active: 1, product_count: 0, created_at: '2026-09-30T10:00:00Z', product_name: 'Café', movement_type: 'sale', qty: -1_000_000, stock_after: 4_000_000 };
const STATS = { products_tracked: 3, products_in_stock: 2, products_out_of_stock: 1, products_low_stock: 1, total_inventory_value: 1000, products_without_cost: 0 };

let hubAnswers = false;
/** The list query of the screen under test: products and the dashboard ask other queries with it. */
let listQuery = '';
let pageCalls = 0;
let queryCalls: string[] = [];
let commandCalls: string[] = [];

beforeAll(async () => {
  customElements.define('ok-data-table', ShellTable);
  await import('../components/erp-inventory-products/erp-inventory-products');
  await import('../components/erp-inventory-categories/erp-inventory-categories');
  await import('../components/erp-inventory-movements/erp-inventory-movements');
  await import('../components/erp-inventory-dashboard/erp-inventory-dashboard');
});

beforeEach(() => {
  document.body.innerHTML = '';
  history.replaceState(null, '', '/');
  hubAnswers = false;
  listQuery = '';
  pageCalls = 0;
  queryCalls = [];
  commandCalls = [];
  const answer = async (name: string) => {
    queryCalls.push(name);
    if (!hubAnswers) throw new Error(REASON);
    return name === 'inventory.products.stats' ? [STATS] : [];
  };
  (globalThis as Record<string, unknown>).erplora = {
    query: answer,
    queryAll: answer,
    queryOptional: async () => undefined,
    queryPage: async (name: string) => {
      if (name === listQuery) pageCalls++;
      else queryCalls.push(name);
      if (!hubAnswers) throw new Error(REASON);
      return { rows: [ROW], total: 1 };
    },
    command: async (name: string) => {
      commandCalls.push(name);
      return {};
    },
    hasPermission: () => true,
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
    currency: 'EUR',
    currencyDecimals: 2,
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
  };
});

type Screen = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> };

async function mountFailed(tag: string, list: string, testid: string): Promise<{ el: Screen; table: HTMLElement }> {
  listQuery = list;
  const el = document.createElement(tag) as Screen;
  document.body.appendChild(el);
  await vi.waitFor(() => {
    if (pageCalls === 0) throw new Error('the list has not asked for its page yet');
  });
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  const table = el.shadowRoot.querySelector<HTMLElement>(`ok-data-table[testid="${testid}"]`);
  expect(table, `${tag} paints its table`).toBeTruthy();
  return { el, table: table! };
}

/** What a person has already typed in the «new» form when they press Retry. A Retry that went
 *  through the screen's own save would send it; with the form EMPTY the save's own validation stops
 *  it before any command, and `commands == []` would pass anyway (rv-verifactu-159). */
const ARMED: Record<string, Record<string, unknown>> = {
  'erp-inventory-products': { newName: 'Té', newSku: 'TE', newPrice: '1,20', newTaxCategoryKey: 'general' },
  'erp-inventory-categories': { newName: 'Bebidas' },
};

async function retry(el: Screen, table: HTMLElement): Promise<void> {
  Object.assign(el, ARMED[el.localName] ?? {});
  await el.updateComplete;
  const before = pageCalls;
  hubAnswers = true;
  table.dispatchEvent(new CustomEvent('retry', { detail: {} }));
  await vi.waitFor(() => {
    if (pageCalls === before) throw new Error('Retry did not ask the hub again');
  });
  await vi.waitFor(async () => {
    await el.updateComplete;
    if ((table as unknown as { error: string }).error !== '') throw new Error('the error is still on the table');
  });
  // Retry only reads: it must never repeat a write the person did not ask for (rv-schedules-61).
  expect(commandCalls, 'Retry sent a command').toEqual([]);
}

describe.each(SCREENS)('$tag — a list that could not load (pm#533)', ({ tag, list, table: testid, banner }) => {
  it('hands the reason to the shell table and paints no second banner', async () => {
    shellTableKnowsErrors(true);
    const { el, table } = await mountFailed(tag, list, testid);
    expect((table as unknown as { error: string }).error).toBe(REASON);
    expect(el.shadowRoot.querySelector(`[data-testid="${banner}"]`), 'the reason would be said twice').toBeNull();
    // Any notice counts, not only the one with this testid (rv-schedules-61).
    expect(el.shadowRoot.textContent, 'another notice repeats the reason').not.toContain(REASON);
  });

  it('Retry on the table asks the hub again and paints the rows that now arrive', async () => {
    shellTableKnowsErrors(true);
    const { el, table } = await mountFailed(tag, list, testid);
    await retry(el, table);
    expect((table as unknown as { rows: unknown[] }).rows).toEqual([ROW]);
  });

  it('on a shell whose table cannot paint the error, keeps its own banner with the reason', async () => {
    shellTableKnowsErrors(false);
    const { el } = await mountFailed(tag, list, testid);
    const node = el.shadowRoot.querySelector(`[data-testid="${banner}"]`);
    expect(node, 'an older hub would show the failure nowhere').toBeTruthy();
    expect(node!.textContent).toContain(REASON);
    // On the PAGE, said once: a notice inside the closed «new» panel is invisible (rv-appointments-227).
    expect(node!.closest('[slot="create"]'), 'the notice sits in the «new» panel').toBeNull();
    expect(el.shadowRoot.textContent!.split(REASON).length - 1, 'the reason is said once').toBe(1);
  });
});

describe('what Retry asks again besides the list (pm#533)', () => {
  // Read once when the screen opens and silent on failure: after a failed start the pickers of the
  // «new product» / «new category» form (tax category, product categories, units) stayed empty and
  // the stock-control default stayed a guess, even once the hub answered. Retry reads them again.
  const count = (query: string) => queryCalls.filter((n) => n === query).length;

  async function retryAsksAgain(tag: string, list: string, testid: string, query: string): Promise<void> {
    shellTableKnowsErrors(true);
    const { el, table } = await mountFailed(tag, list, testid);
    await vi.waitFor(() => {
      if (count(query) !== 1) throw new Error(`${query} is asked once with the list`);
    });
    await retry(el, table);
    await vi.waitFor(() => {
      if (count(query) < 2) throw new Error(`${query} was not asked again`);
    });
  }

  it.each(['taxes.categories.list', 'taxes.rules.list', 'inventory.categories.list', 'inventory.units.list', 'inventory.settings.get'])(
    'products: Retry also asks again for %s',
    async (query) => {
      await retryAsksAgain('erp-inventory-products', 'inventory.products.list', 'inventory-products-table', query);
    },
  );

  it.each(['taxes.categories.list', 'taxes.rules.list'])('categories: Retry also asks again for %s', async (query) => {
    await retryAsksAgain('erp-inventory-categories', 'inventory.categories.list', 'inventory-categories-table', query);
  });

  it('dashboard: Retry also asks again for the stock figures', async () => {
    await retryAsksAgain('erp-inventory-dashboard', 'inventory.products.low_stock', 'inventory-dashboard-low-stock-table', 'inventory.products.stats');
  });
});

describe('dashboard: the figures failed together with the list (pm#533)', () => {
  // Both reads fail for the same reason when the hub does not answer. The table already says it
  // with its Retry, which reads the figures again: a second red notice above it only repeats the
  // failure. Once Retry works, the figures are painted and no notice is left behind.
  const STATS_ERROR = 'inventory-dashboard-stats-error';

  it.each([true, false])('says it once, not a second time for the figures (shell table paints errors: %s)', async (knows) => {
    shellTableKnowsErrors(knows);
    const { el } = await mountFailed('erp-inventory-dashboard', 'inventory.products.low_stock', 'inventory-dashboard-low-stock-table');
    expect(el.shadowRoot.querySelector(`[data-testid="${STATS_ERROR}"]`), 'the figures repeat the failure').toBeNull();
  });

  it('after Retry the figures are painted and no notice is left', async () => {
    shellTableKnowsErrors(true);
    const { el, table } = await mountFailed('erp-inventory-dashboard', 'inventory.products.low_stock', 'inventory-dashboard-low-stock-table');
    await retry(el, table);
    await vi.waitFor(async () => {
      await el.updateComplete;
      if (!el.shadowRoot.querySelector('[data-testid="inventory-dashboard-kpi-tracked"]')) throw new Error('the figures are not painted');
    });
    expect(el.shadowRoot.querySelector(`[data-testid="${STATS_ERROR}"]`)).toBeNull();
  });

  it('when only the figures fail, their own notice still says so', async () => {
    shellTableKnowsErrors(true);
    listQuery = 'inventory.products.low_stock';
    // The list answers, the figures do not.
    const g = globalThis as unknown as { erplora: { query: (n: string) => Promise<unknown>; queryPage: (n: string) => Promise<unknown> } };
    g.erplora.query = async (name: string) => {
      queryCalls.push(name);
      throw new Error(REASON);
    };
    g.erplora.queryPage = async (name: string) => {
      if (name === listQuery) pageCalls++;
      return { rows: [ROW], total: 1 };
    };
    const el = document.createElement('erp-inventory-dashboard') as Screen;
    document.body.appendChild(el);
    await vi.waitFor(async () => {
      await el.updateComplete;
      if (!el.shadowRoot.querySelector(`[data-testid="${STATS_ERROR}"]`)) throw new Error('the failed figures say nothing');
    });
  });
});
