// No `ion-*` of this module takes its colour from `color=` (ERPlora/pm#392, module-toolkit#273).
//
// Ionic implements `color="warning"` with a GLOBAL rule of the document stylesheet
// (`.ion-color-warning { --ion-color-base: … }`), which does not reach inside a shadow root. Measured
// in a browser (Ionic in `ios` mode, like the Hub) on origin/main:
//   · OUTSIDE a modal the colour is lost: the «products without cost» note of the dashboard and the
//     «Unconfigured» chip of the products table rendered in plain text colour, no amber at all;
//   · INSIDE an `ion-modal` it happened to work, because Ionic reparents an open modal to <body>,
//     where the global rule applies — and for that same reason the component's `static styles`
//     never reach a modal (inventory#45).
// So the colour goes INLINE, as custom properties read from the theme token: the one form that
// paints the same in the shadow root, inside `ok-data-table`'s cell and in a reparented modal.
//
// happy-dom neither lays out nor loads Ionic's CSS, so what is pinned here is the CONTRACT (no
// `color=` in the source, and every coloured element carries its tone inline); the computed colours
// were measured in a real browser.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { render } from 'lit';
import { beforeEach, describe, expect, it } from 'vitest';
import { ionTone } from './lib/ion-tone';

// The `ui/` of THIS checkout, from the test's own URL: a fixed folder name (`modules/inventory`, a
// worktree) would scan a sibling checkout and let a `color=` added HERE through.
const UI = path.dirname(fileURLToPath(import.meta.url));

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sources(full));
    else if (/\.ts$/.test(entry.name) && !/\.(test|spec)\.ts$/.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * The attribute names of every `<ion-*>` opening tag. A Lit tag does not end at the first `>`
 * (`@click=${() => …}`), so `${…}` expressions and quoted values are skipped, not read.
 */
function ionTags(source: string): { line: number; attrs: string }[] {
  const found: { line: number; attrs: string }[] = [];
  const start = /<ion-[a-z-]+(?=[\s/>])/g;
  let m: RegExpExecArray | null;
  while ((m = start.exec(source))) {
    let attrs = '';
    let depth = 0;
    let quote: string | null = null;
    for (let i = m.index + m[0].length; i < source.length; i += 1) {
      const ch = source[i];
      if (quote) {
        if (ch === '\\') i += 1;
        else if (ch === quote) quote = null;
        continue;
      }
      if (depth > 0) {
        if (ch === '"' || ch === "'" || ch === '`') quote = ch;
        else if (ch === '{') depth += 1;
        else if (ch === '}') depth -= 1;
        continue;
      }
      if (ch === '$' && source[i + 1] === '{') { depth = 1; i += 1; continue; }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (ch === '>') break;
      attrs += ch;
    }
    found.push({ line: source.slice(0, m.index).split('\n').length, attrs: `${m[0]}${attrs}` });
  }
  return found;
}

const DECLARES_COLOR = /(?:^|\s)\.?color=/;

describe('pm#392: no ion-* delegates its colour to color=', () => {
  it('the source of ui/ carries no color= on an ion-* element', () => {
    const offenders = sources(UI).flatMap((file) =>
      ionTags(readFileSync(file, 'utf8'))
        .filter((t) => DECLARES_COLOR.test(t.attrs))
        .map((t) => `${path.relative(UI, file)}:${t.line}`),
    );
    expect(offenders, 'color= paints nothing inside a module shadow root').toEqual([]);
  });

  it('the reader sees a color= hidden behind an arrow function or on its own line (control of the control)', () => {
    expect(ionTags('<ion-button @click=${() => this.go()} color="danger">x</ion-button>').filter((t) => DECLARES_COLOR.test(t.attrs))).toHaveLength(1);
    expect(ionTags('<ion-note\n  slot="end"\n  color=${x ? "a" : "b"}\n>').filter((t) => DECLARES_COLOR.test(t.attrs))).toHaveLength(1);
    expect(ionTags('<ion-button @click=${() => ({ color: 1 })}>x</ion-button>').filter((t) => DECLARES_COLOR.test(t.attrs))).toHaveLength(0);
  });
});

describe('ionTone: the inline custom properties, read from the theme token', () => {
  it('a solid button paints its background, its states and its text from the tone', () => {
    const s = ionTone('solid', 'danger');
    expect(s).toContain('--background: var(--ion-color-danger, #c5000f)');
    expect(s).toContain('--background-activated: var(--ion-color-danger-shade, #ad000d)');
    expect(s).toContain('--background-focused: var(--ion-color-danger-shade, #ad000d)');
    expect(s).toContain('--background-hover: var(--ion-color-danger-tint, #cb1a27)');
    expect(s).toContain('--color: var(--ion-color-danger-contrast, #fff)');
  });

  it('a text element (ion-note, ion-icon) takes the tone as its colour', () => {
    const s = ionTone('text', 'success');
    expect(s).toContain('--color: var(--ion-color-success, #2dd55b)');
    expect(s).toContain('color: var(--ion-color-success, #2dd55b)');
  });

  it('a chip gets the translucent tone as background and the shade as text, like Ionic does', () => {
    const s = ionTone('chip', 'warning');
    expect(s).toContain('--background: rgba(var(--ion-color-warning-rgb, 255, 196, 9), 0.08)');
    expect(s).toContain('--color: var(--ion-color-warning-shade, #e0ac08)');
  });

  it('each of the four tones this module uses resolves to its own token', () => {
    for (const tone of ['danger', 'success', 'warning', 'medium'] as const) {
      expect(ionTone('text', tone)).toMatch(new RegExp(`var\\(--ion-color-${tone}, #[0-9a-f]{6}\\)`));
    }
  });
});

// ── Render: every place that used to say `color=` now carries its tone ───────────────────────────

function stub() {
  const P = { id: 'p1', name: 'Café solo', sku: 'CAF', price: 220, stock: 10_000_000, unit_code: 'ud', is_active: 1 };
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) =>
      name === 'inventory.products.stats'
        ? [{ total_products: 5, products_tracked: 4, products_in_stock: 2, products_out_of_stock: 2, products_low_stock: 0, products_without_cost: 2, total_inventory_value: 0 }]
        : [],
    queryAll: async () => [],
    queryPage: async () => ({ rows: [P], total: 1, limit: 50, offset: 0 }),
    command: async () => ({}),
    hasPermission: () => true,
    on: () => () => {},
    currency: 'EUR',
    formatMoney: (cents: number) => `${((cents || 0) / 100).toFixed(2)} €`,
    formatAmount: (units: number) => `${(units || 0).toFixed(2)} €`,
    t: (_catalog: unknown, key: string) => key,
    loadSlot: async () => [],
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
  stub();
});

type Wc = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> } & Record<string, unknown>;

async function mount(tag: string, load: () => Promise<unknown>): Promise<Wc> {
  await load();
  const el = document.createElement(tag) as Wc;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

const byTestId = (el: Wc, id: string) => el.shadowRoot.querySelector(`[data-testid="${id}"]`);
const styleOf = (n: Element | null | undefined) => n?.getAttribute('style') ?? '';

describe('pm#392: the tone travels inline, so it paints in the shadow root AND in a reparented modal', () => {
  it('dashboard: the «without cost» note is amber', async () => {
    const el = await mount('erp-inventory-dashboard', () => import('./components/erp-inventory-dashboard/erp-inventory-dashboard'));
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;
    const note = byTestId(el, 'inventory-dashboard-without-cost');
    expect(note, 'the note renders when products lack a cost').not.toBeNull();
    expect(styleOf(note)).toContain(ionTone('text', 'warning'));
    expect(note!.hasAttribute('color')).toBe(false);
  });

  it('categories: the delete confirmation is a solid danger button', async () => {
    const el = await mount('erp-inventory-categories', () => import('./components/erp-inventory-categories/erp-inventory-categories'));
    el.deleteTarget = { id: 'c1', name: 'Bebidas' };
    await el.updateComplete;
    const btn = byTestId(el, 'inventory-categories-delete-submit');
    expect(styleOf(btn)).toContain(ionTone('solid', 'danger'));
    expect(btn!.hasAttribute('color')).toBe(false);
  });

  it('products: delete confirmation, count difference, import report and detail status carry their tone', async () => {
    const el = await mount('erp-inventory-products', () => import('./components/erp-inventory-products/erp-inventory-products'));

    el.deleteTarget = { id: 'p1', name: 'Café solo', sku: 'CAF' };
    await el.updateComplete;
    expect(styleOf(byTestId(el, 'inventory-products-delete-submit'))).toContain(ionTone('solid', 'danger'));
    el.deleteTarget = null;

    // Count: a lower quantity is a loss (danger); nothing typed yet explains why Apply is grey (medium).
    el.countTarget = { id: 'p1', name: 'Café solo', sku: 'CAF', stock: 10_000_000, unit_code: 'ud' };
    el.countValue = '';
    await el.updateComplete;
    const notes = () => [...el.shadowRoot.querySelectorAll('ion-note')].map(styleOf);
    expect(notes().some((s) => s.includes(ionTone('text', 'medium'))), 'the «why is it grey» hint').toBe(true);
    el.countValue = '4';
    await el.updateComplete;
    expect(notes().some((s) => s.includes(ionTone('text', 'danger'))), 'a negative difference').toBe(true);
    el.countValue = '12';
    await el.updateComplete;
    expect(notes().some((s) => s.includes(ionTone('text', 'success'))), 'a positive difference').toBe(true);
    el.countTarget = null;
    await el.updateComplete;

    // Import report: created is green; failed is red when there are failures, green when none.
    el.importReport = { total: 3, created: 2, skipped: 0, failed: [{ line: 3, sku: 'X', reason: 'r' }] };
    await el.updateComplete;
    const report = notes();
    expect(report.filter((s) => s.includes(ionTone('text', 'success'))).length, 'created').toBeGreaterThanOrEqual(1);
    expect(report.some((s) => s.includes(ionTone('text', 'danger'))), 'failed > 0').toBe(true);
    el.importReport = null;

    // Product detail: the status of an unconfigured product is amber, of a configured one medium.
    el.detail = { id: 'p1', name: 'Café solo', sku: 'CAF', price: 220, stock: 10_000_000, unit_code: 'ud', is_active: 1, tax_category_key: 'standard' };
    await el.updateComplete;
    expect(notes().some((s) => s.includes(ionTone('text', 'medium'))), 'configured product status').toBe(true);
    el.detail = { id: 'p2', name: 'Sin IVA', sku: 'NOTAX', price: 220, stock: 0, unit_code: 'ud', is_active: 1, tax_category_key: null };
    await el.updateComplete;
    expect(notes().some((s) => s.includes(ionTone('text', 'warning'))), 'unconfigured product status').toBe(true);

    expect([...el.shadowRoot.querySelectorAll('ion-button, ion-note, ion-chip')].filter((n) => n.hasAttribute('color'))).toEqual([]);
  });

  it('products table: the «Unconfigured» chip is amber, and so is its icon', async () => {
    const el = await mount('erp-inventory-products', () => import('./components/erp-inventory-products/erp-inventory-products'));
    const host = document.createElement('div');
    const cell = (el as unknown as { renderUnconfigured(r: Record<string, unknown>): unknown }).renderUnconfigured({ id: 'p9', price: 0 });
    render(cell, host);
    const chip = host.querySelector('ion-chip');
    expect(chip).not.toBeNull();
    expect(styleOf(chip)).toContain(ionTone('chip', 'warning'));
    expect(chip!.hasAttribute('color')).toBe(false);
    expect(styleOf(chip!.querySelector('ion-icon'))).toContain('color: inherit');
  });
});
