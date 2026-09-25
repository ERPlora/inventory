// Contract of the barcode label PRINT GATE (issue #30, ADR-0196 decision 5: ONE print door).
//
// `erp-inventory-products` used to open a popup (`window.open`) whose HTML self-fired
// `window.print()` inline. That bypasses the Hub's single print gate: no Bridge routing (a real
// label printer never gets the job), popup blockers eat it, and the inline <script> is CSP-hostile.
//
// The contract fixed here (same cascade as sales/ui/lib/document-modal.ts):
//   1. `erplora.print` (the shell gate: Bridge first, isolated iframe as browser fallback);
//   2. no gate (toolkit preview, tests) → isolated iframe, NEVER a popup;
//   3. the label HTML is plain, self-contained and carries NO inline script — printing is the
//      cascade's job, not the document's.
//
// issue #44 adds the other half — going through the door is not the same as printing:
//   · `documentType` must be a word the ESC/POS renderer KNOWS. Its vocabulary is closed
//     (`hub/crates/peripherals/src/escpos.rs`, `DocumentType::parse` → `_ => return None`), and
//     `label` is not in it: the job was refused after crossing the gate. The word is `barcode_label`.
//   · the thermal path prints `data`, NOT `html` (the gate forwards `req.data` to
//     `peripherals.print`; `html` only feeds the browser fallback). With an empty `data` a real
//     label printer spat out a BLANK label.
//   · the result must be READ. `sdk.print()` resolves a `PrintResult{via, role, error}`; the old
//     `void` threw it away, so every failure above was invisible to the user.
//   · inside the INSTALLED app `via:'browser'` is a FALSE success: the WKWebView/WebView2 has no
//     print dialog, so nothing ever comes out. It counts as a failure and must be said out loud.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { barcodeLabelHtml, printBarcodeLabel } from './barcode-print.js';

beforeEach(() => {
  delete (globalThis as Record<string, unknown>).erplora;
  delete (globalThis as Record<string, unknown>).__TAURI__;
});
afterEach(() => {
  delete (globalThis as Record<string, unknown>).erplora;
  delete (globalThis as Record<string, unknown>).__TAURI__;
});

/** Shell gate double: resolves the `PrintResult` it is told to. */
function fakeGate(result: Record<string, unknown> | Error) {
  const print = vi.fn(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  (globalThis as Record<string, unknown>).erplora = { print };
  return print;
}

describe('barcodeLabelHtml', () => {
  it('is self-contained (barcode SVG + SKU + name) with NO inline script', () => {
    const html = barcodeLabelHtml('CAF-01', 'Café solo');
    expect(html, 'carries the Code128 barcode as SVG rects').toContain('<svg');
    expect(html).toContain('<rect');
    expect(html, 'shows the SKU under the barcode').toContain('CAF-01');
    expect(html, 'shows the product name').toContain('Café solo');
    // Printing belongs to the cascade, never to the document itself.
    expect(html, 'no inline <script>').not.toContain('<script');
    expect(html, 'no self-firing window.print()').not.toContain('window.print');
  });

  it('escapes HTML in SKU and name (they are user data, not markup)', () => {
    const html = barcodeLabelHtml('A&B<1>', '<b>Café</b> "fuerte"');
    expect(html).not.toContain('<b>Café</b>');
    expect(html).toContain('&lt;b&gt;Café&lt;/b&gt;');
    expect(html).toContain('A&amp;B&lt;1&gt;');
  });
});

describe('printBarcodeLabel — the cascade', () => {
  it('prefers the shell gate `erplora.print` (Bridge-aware) when present', async () => {
    const print = fakeGate({ via: 'bridge', role: 'label', printerId: 'network:10.0.0.5:9100' });
    const iframePrint = vi.fn();

    const out = await printBarcodeLabel({ sku: 'CAF-01', name: 'Café solo' }, { iframePrint });

    expect(print).toHaveBeenCalledTimes(1);
    const req = print.mock.calls[0][0] as Record<string, unknown>;
    expect(req.role, 'routes to the label-printer role').toBe('label');
    expect(String(req.html), 'ships the self-contained label HTML for the browser fallback').toContain('CAF-01');
    expect(req.jobId, 'traceable job id').toBe('barcode-CAF-01');
    expect(iframePrint, 'the gate owns the fallback: no local iframe').not.toHaveBeenCalled();
    expect(out.ok, 'the Bridge printed it').toBe(true);
    expect(out.via).toBe('bridge');
  });

  it('without the gate it falls back to the isolated iframe, never a popup', async () => {
    const iframePrint = vi.fn();
    const openSpy = vi.spyOn(window, 'open');

    const out = await printBarcodeLabel({ sku: 'CAF-01', name: 'Café solo' }, { iframePrint });

    expect(iframePrint).toHaveBeenCalledTimes(1);
    expect(String(iframePrint.mock.calls[0][0])).toContain('CAF-01');
    expect(openSpy, 'window.open is dead: popup blockers ate the old path').not.toHaveBeenCalled();
    expect(out.ok, 'the print dialog opened: from here it is the user’s move').toBe(true);
    openSpy.mockRestore();
  });

  it('an SDK without `print` (older shell) also falls back to the iframe', async () => {
    (globalThis as Record<string, unknown>).erplora = { query: async () => [] };
    const iframePrint = vi.fn();

    const out = await printBarcodeLabel({ sku: 'CAF-01', name: 'Café solo' }, { iframePrint });

    expect(iframePrint).toHaveBeenCalledTimes(1);
    expect(out.ok).toBe(true);
  });
});

describe('printBarcodeLabel — the document the PRINTER gets (issue #44)', () => {
  it('declares `barcode_label`, the only word the ESC/POS renderer knows for a label', async () => {
    const print = fakeGate({ via: 'bridge', role: 'label' });

    await printBarcodeLabel({ sku: 'CAF-01', name: 'Café solo' });

    const req = print.mock.calls[0][0] as Record<string, unknown>;
    // `DocumentType::parse` is a closed match with `_ => return None`: `label` was refused.
    expect(req.documentType).toBe('barcode_label');
    expect(req.documentType, 'the vocabulary has no `label`').not.toBe('label');
  });

  it('ships STRUCTURED `data` with the fields `render_barcode_label` reads', async () => {
    const print = fakeGate({ via: 'bridge', role: 'label' });

    await printBarcodeLabel({ sku: 'CAF-01', name: 'Café solo' });

    const req = print.mock.calls[0][0] as Record<string, unknown>;
    const data = req.data as Record<string, unknown>;
    // The renderer reads exactly these keys (str_field/as_f64). Anything else it ignores, and an
    // empty `data` prints an empty label: title blank, no barcode at all.
    expect(data, 'the thermal path prints `data`, not `html`').toBeTruthy();
    expect(data.product_name, 'printed as the label title').toBe('Café solo');
    expect(data.barcode, 'the value the GS k symbol encodes: the SKU').toBe('CAF-01');
  });

  it('sends the price in MAJOR units: the renderer formats `{price:.2}` with no ×100', async () => {
    const print = fakeGate({ via: 'bridge', role: 'label' });

    // Money crosses the module boundary in CENTS (ADR-0007/0123). 220 cents on a label that
    // formats the number raw would read «220.00» — a 2,20 € coffee priced at 220 €.
    await printBarcodeLabel({ sku: 'CAF-01', name: 'Café solo', priceCents: 220 });

    const data = (print.mock.calls[0][0] as Record<string, unknown>).data as Record<string, unknown>;
    expect(data.price).toBe(2.2);
  });

  // inventory#101 (from hub#2129): the minor unit is the HUB currency's, not always a cent. The
  // renderer prints `price` with the hub scale, so a fixed `/ 100` printed a 480 ¥ tea as «5».
  it.each([
    { currency: 'JPY', decimals: 0, minor: 480, major: 480 },
    { currency: 'KWD', decimals: 3, minor: 1234, major: 1.234 },
    { currency: 'EUR', decimals: 2, minor: 220, major: 2.2 },
  ])('converts with the hub currency scale ($currency, $decimals decimals)', async ({ decimals, minor, major }) => {
    const print = fakeGate({ via: 'bridge', role: 'label' });
    (globalThis as { erplora: Record<string, unknown> }).erplora.currencyDecimals = decimals;

    await printBarcodeLabel({ sku: 'TEA-01', name: 'Té', priceCents: minor });

    const data = (print.mock.calls[0][0] as Record<string, unknown>).data as Record<string, unknown>;
    expect(data.price).toBe(major);
  });

  it.each([undefined, -1, 2.5, '0', Number.NaN])(
    'an SDK without a valid scale (%s) is a two-decimal hub, like the rest of the modules',
    async (bad) => {
      const print = fakeGate({ via: 'bridge', role: 'label' });
      (globalThis as { erplora: Record<string, unknown> }).erplora.currencyDecimals = bad;

      await printBarcodeLabel({ sku: 'CAF-01', name: 'Café solo', priceCents: 220 });

      const data = (print.mock.calls[0][0] as Record<string, unknown>).data as Record<string, unknown>;
      expect(data.price).toBe(2.2);
    },
  );

  it('omits `price` when there is none (the renderer only prints it if present)', async () => {
    const print = fakeGate({ via: 'bridge', role: 'label' });

    await printBarcodeLabel({ sku: 'CAF-01', name: 'Café solo' });

    const data = (print.mock.calls[0][0] as Record<string, unknown>).data as Record<string, unknown>;
    expect('price' in data, 'no invented 0,00 € on the shelf label').toBe(false);
  });
});

describe('printBarcodeLabel — a failure is NEVER silent (issue #44)', () => {
  it('reports the outcome instead of swallowing it: `via:none` is a failure with its reason', async () => {
    fakeGate({ via: 'none', role: 'label', error: 'el runtime rechazó el encolado' });

    const out = await printBarcodeLabel({ sku: 'CAF-01', name: 'Café solo' });

    expect(out.ok, 'nothing came out: the user has to be told').toBe(false);
    expect(out.reason).toBe('gate_error');
    expect(out.detail, 'carries the gate’s own reason for the message tail').toContain('encolado');
  });

  it('a gate that rejects does not blow up the page: it comes back as a failure', async () => {
    fakeGate(new Error('print host desconectado'));

    const out = await printBarcodeLabel({ sku: 'CAF-01', name: 'Café solo' });

    expect(out.ok).toBe(false);
    expect(out.reason).toBe('threw');
    expect(out.detail).toContain('print host desconectado');
  });

  it('`via:queue` is a success: no printer here and now, but the job is not lost', async () => {
    fakeGate({ via: 'queue', role: 'label' });

    const out = await printBarcodeLabel({ sku: 'CAF-01', name: 'Café solo' });

    expect(out.ok).toBe(true);
    expect(out.via).toBe('queue');
  });

  it('in the INSTALLED app `via:browser` is a FALSE success → failure, with the printer as the cause', async () => {
    fakeGate({ via: 'browser', role: 'label', error: 'sin cola: falta jobId o enqueue' });

    const out = await printBarcodeLabel(
      { sku: 'CAF-01', name: 'Café solo' },
      { isInstalledApp: () => true },
    );

    // The installed app has no print dialog: the browser fallback resolves fine and prints NOTHING.
    expect(out.ok, 'the webview cannot print: this is the silent failure of #44').toBe(false);
    expect(out.reason, 'the real cause: no printer holds the `label` role').toBe('no_printer');
  });

  it('in a plain BROWSER `via:browser` is a real success (the print dialog does open)', async () => {
    fakeGate({ via: 'browser', role: 'label' });

    const out = await printBarcodeLabel({ sku: 'CAF-01', name: 'Café solo' }, { isInstalledApp: () => false });

    expect(out.ok).toBe(true);
  });

  it('detects the installed app by the Tauri global, like the shell does (no injection needed)', async () => {
    fakeGate({ via: 'browser', role: 'label' });
    // Same probe as `hub/apps/web/src/lib/device.ts` (`window.__TAURI__.core.invoke`).
    (globalThis as Record<string, unknown>).__TAURI__ = { core: { invoke: async () => null } };

    const out = await printBarcodeLabel({ sku: 'CAF-01', name: 'Café solo' });

    expect(out.ok, 'no injected seam: the default detection must catch the webview too').toBe(false);
    expect(out.reason).toBe('no_printer');
  });
});
