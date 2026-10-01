// inventory#130: the Movements columns declared no width, so ok-data-table gave the eight of them
// the same minmax(5.5rem,1fr). On a tablet (820 px) every column got 88 px: the date lost its time
// («30/09/2026...») and the product read «Producto d...», while Reason and Reference — usually
// empty — took as much room as the name. The row also overflowed sideways (4 px at 820, 40 px at
// 1024 with the side menu open). Each column now declares the width its content needs and the name
// takes what is left over.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatListDateTime } from '../../lib/list-date';

type Col = { key: string; header: string; width?: string; format?: (r: Record<string, unknown>) => string };

beforeEach(() => {
  document.body.innerHTML = '';
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryPage: async () => ({ rows: [], total: 0, limit: 50, offset: 0 }),
    command: async () => ({}),
    locale: 'es',
    t: (_c: unknown, key: string) => key,
    loadSlot: async () => [],
  };
});

afterEach(() => vi.useRealTimers());

async function columns(): Promise<Col[]> {
  await import('./erp-inventory-movements');
  const el = document.createElement('erp-inventory-movements') as HTMLElement & { updateComplete: Promise<unknown> };
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  const table = el.shadowRoot?.querySelector('ok-data-table') as unknown as { columns: Col[] };
  return table.columns;
}

/** A track is a fixed `<n>rem` or a `minmax(<n>rem,<m>fr)` that grows with the leftover. */
function track(c: Col): { floorPx: number; fr: number } {
  const w = c.width ?? '';
  const fixed = /^(\d+(?:\.\d+)?)rem$/.exec(w);
  if (fixed) return { floorPx: Number(fixed[1]) * 16, fr: 0 };
  const grows = /^minmax\((\d+(?:\.\d+)?)rem,\s*(\d+(?:\.\d+)?)fr\)$/.exec(w);
  expect(grows, `${c.key} declares a rem width or a rem floor that grows with fr (got «${w}»)`).not.toBeNull();
  return { floorPx: Number(grows![1]) * 16, fr: Number(grows![2]) };
}

/** CSS grid's flexible-length resolution for these tracks: a track whose floor is bigger than its
 *  fr share is frozen at the floor and the rest of the leftover is shared out again. */
function resolve(cols: Col[], available: number): Map<string, number> {
  const tracks = cols.map((c) => ({ key: c.key, ...track(c) }));
  const out = new Map<string, number>();
  let flexible = tracks.filter((t) => t.fr > 0);
  for (const t of tracks) if (t.fr === 0) out.set(t.key, t.floorPx);
  for (;;) {
    const frozen = [...out.values()].reduce((a, b) => a + b, 0);
    const unit = (available - frozen) / flexible.reduce((a, t) => a + t.fr, 0);
    const tooSmall = flexible.filter((t) => t.fr * unit < t.floorPx);
    if (!tooSmall.length) {
      for (const t of flexible) out.set(t.key, t.fr * unit);
      return out;
    }
    for (const t of tooSmall) out.set(t.key, t.floorPx);
    flexible = flexible.filter((t) => !tooSmall.includes(t));
  }
}

describe('Movements fits a tablet and gives the name what is left (inventory#130)', () => {
  it('on a tablet the name is wide enough to tell «Producto de prueba 001» from «… 002»', async () => {
    // At 820x1180 the data columns have 700 px. «Producto de prueba 002» is 158 px on the bench:
    // with 156 px it printed «Producto de prueba 0...», the same as its neighbour 001.
    const cols = await columns();
    expect(resolve(cols, 700).get('product_name')).toBeGreaterThanOrEqual(160);
  });

  it('on a desktop the name does not starve the reason or the reference that fitted before', async () => {
    // At 1440x900 (side menu open) the data columns have 1080 px. «Recuento mensual» is 119 px and
    // a delivery note «ALB-2026-000123» 122 px: both fitted in the old equal split (135 px). The
    // longest product name on the bench is 265 px.
    const cols = await columns();
    const desktop = resolve(cols, 1080);
    expect(desktop.get('reason')).toBeGreaterThanOrEqual(120);
    expect(desktop.get('reference')).toBeGreaterThanOrEqual(130);
    expect(desktop.get('product_name')).toBeGreaterThanOrEqual(265);
  });


  it('every column declares its width, and the floors fit a tablet without scrolling sideways', async () => {
    // Measured on the hub:dev bench: at 1024x768 with the side menu open the table is 752 px wide
    // and the row spends 32 px of padding and 7 x 8 px of gaps, so the data columns have 664 px
    // (at 820x1180 they have 700). The old eight 88 px floors needed 704 and scrolled.
    const cols = await columns();
    expect(cols.map((c) => c.key)).toEqual([
      'created_at', 'product_name', 'sku', 'movement_type', 'qty', 'stock_after', 'reason', 'reference',
    ]);
    const sum = cols.reduce((acc, c) => acc + track(c).floorPx, 0);
    expect(sum).toBeLessThanOrEqual(664);
  });

  it('each floor still holds the widest thing its column paints (bench, es/en, ios/md)', async () => {
    const cols = await columns();
    const floor = (key: string) => track(cols.find((c) => c.key === key)!).floorPx;
    // «9/30, 11:45 AM» in English is 97 px; the Spanish «30/9, 23:45» is shorter.
    expect(floor('created_at')).toBeGreaterThanOrEqual(100);
    // The name keeps more than the 88 px that printed «Producto d...».
    expect(floor('product_name')).toBeGreaterThanOrEqual(120);
    // «SKU-0005» is 69 px.
    expect(floor('sku')).toBeGreaterThanOrEqual(72);
    // «Anulación», «Recepción», «Descuento» are 70 px.
    expect(floor('movement_type')).toBeGreaterThanOrEqual(72);
    // The headers with their sort caret: «CANTIDAD»/«QUANTITY» 80 px, «BALANCE» 74 px.
    expect(floor('qty')).toBeGreaterThanOrEqual(84);
    expect(floor('stock_after')).toBeGreaterThanOrEqual(76);
    // The headers «REASON» 50 px and «REFERENCIA» 75 px: a header is never cut.
    expect(floor('reason')).toBeGreaterThanOrEqual(52);
    expect(floor('reference')).toBeGreaterThanOrEqual(76);
  });

  it('the name takes the biggest share of the leftover and the short columns stay put', async () => {
    const cols = await columns();
    const fr = (key: string) => track(cols.find((c) => c.key === key)!).fr;
    for (const c of cols) {
      if (c.key !== 'product_name') expect(fr('product_name'), `name grows more than ${c.key}`).toBeGreaterThan(fr(c.key));
    }
    // Type, quantity and balance paint a word or a short number: room they do not use goes to the name.
    expect(fr('movement_type')).toBe(0);
    expect(fr('qty')).toBe(0);
    expect(fr('stock_after')).toBe(0);
    // An older movement prints «31/12/2025, 23:45» (118 px): the date grows where there is room.
    expect(fr('created_at')).toBeGreaterThan(0);
  });

  it('the Date column prints the short list instant in the hub language', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-01T10:00:00'));
    const cols = await columns();
    const date = cols.find((c) => c.key === 'created_at')!;
    for (const value of ['2026-09-30T22:35:00.093240004+00:00', '2025-12-31T12:00:00+00:00']) {
      expect(date.format?.({ created_at: value })).toBe(formatListDateTime(value, 'es'));
    }
    (globalThis as { erplora: { locale: string } }).erplora.locale = 'en';
    expect(date.format?.({ created_at: '2026-09-30T12:00:00Z' })).toBe(formatListDateTime('2026-09-30T12:00:00Z', 'en'));
  });
});
