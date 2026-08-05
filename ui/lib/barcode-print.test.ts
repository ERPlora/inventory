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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { barcodeLabelHtml, printBarcodeLabel } from './barcode-print.js';

beforeEach(() => {
  delete (globalThis as Record<string, unknown>).erplora;
});
afterEach(() => {
  delete (globalThis as Record<string, unknown>).erplora;
});

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
  it('prefers the shell gate `erplora.print` (Bridge-aware) when present', () => {
    const print = vi.fn(async () => ({}));
    (globalThis as Record<string, unknown>).erplora = { print };
    const iframePrint = vi.fn();

    printBarcodeLabel('CAF-01', 'Café solo', { iframePrint });

    expect(print).toHaveBeenCalledTimes(1);
    const req = print.mock.calls[0][0] as Record<string, unknown>;
    expect(req.role, 'routes to the label-printer role').toBe('label');
    expect(req.documentType).toBe('label');
    expect(String(req.html), 'ships the self-contained label HTML').toContain('CAF-01');
    expect(req.jobId, 'traceable job id').toBe('barcode-CAF-01');
    expect(iframePrint, 'the gate owns the fallback: no local iframe').not.toHaveBeenCalled();
  });

  it('without the gate it falls back to the isolated iframe, never a popup', () => {
    const iframePrint = vi.fn();
    const openSpy = vi.spyOn(window, 'open');

    printBarcodeLabel('CAF-01', 'Café solo', { iframePrint });

    expect(iframePrint).toHaveBeenCalledTimes(1);
    expect(String(iframePrint.mock.calls[0][0])).toContain('CAF-01');
    expect(openSpy, 'window.open is dead: popup blockers ate the old path').not.toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it('an SDK without `print` (older shell) also falls back to the iframe', () => {
    (globalThis as Record<string, unknown>).erplora = { query: async () => [] };
    const iframePrint = vi.fn();

    printBarcodeLabel('CAF-01', 'Café solo', { iframePrint });

    expect(iframePrint).toHaveBeenCalledTimes(1);
  });
});
