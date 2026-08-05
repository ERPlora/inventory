// Barcode label printing through the Hub's SINGLE print gate (issue #30, ADR-0196 decision 5).
//
// The cascade — same shape as sales/ui/lib/document-modal.ts:
//   1. `erplora.print` (shell gate): Bridge/label printer first, isolated-iframe browser fallback.
//   2. No gate (toolkit preview, tests) → local isolated iframe. NEVER `window.open`: popup
//      blockers eat it, and its inline `window.print()` <script> bypassed the gate and CSP.
//   3. `window.print()` only as the theoretical last resort, when there is no HTML to isolate.
//
// The label HTML is plain and self-contained (no web components, no app CSS, no scripts) so the
// SAME document works for the Bridge, the iframe and a future PDF path.
import { code128b } from './code128.js';

/** Escapes user data (SKU, product name) interpolated into the label markup. */
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Self-contained HTML of the barcode label: Code128 SVG + SKU + product name. No scripts. */
export function barcodeLabelHtml(sku: string, name: string): string {
  const bc = code128b(sku, 2, 90);
  const rects = bc.bars.map((b) => `<rect x="${b.x}" y="0" width="${b.w}" height="${bc.height}"/>`).join('');
  return (
    `<!doctype html><html><head><meta charset="utf-8"><title>${esc(sku)}</title></head>` +
    `<body style="margin:0;display:grid;place-items:center;min-height:100vh;font-family:system-ui">` +
    `<div style="text-align:center;padding:8px">` +
    `<svg width="${bc.width}" height="${bc.height}" viewBox="0 0 ${bc.width} ${bc.height}" fill="#000">${rects}</svg>` +
    `<div style="font:14px monospace;margin-top:6px">${esc(sku)}</div>` +
    `<div style="font:13px system-ui;color:#555">${esc(name)}</div>` +
    `</div></body></html>`
  );
}

/**
 * Prints a self-contained HTML in an **isolated iframe**. Minimal copy of the shell helper so the
 * module does not depend on it (modules never import Hub code): when the shell exposes
 * `erplora.print` THAT gate is used — it tries the Bridge first —; this is the last resort when
 * the module runs without a shell (toolkit preview, tests).
 */
export function printHtmlInIframe(html: string, doc: Document = document): void {
  const frame = doc.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:80mm;height:1px;border:0;visibility:hidden;';
  doc.body.appendChild(frame);
  const w = frame.contentWindow; const d = frame.contentDocument;
  if (!w || !d) { frame.remove(); return; }
  d.open(); d.write(html); d.close();
  const fire = () => { try { w.focus(); w.print(); } finally { setTimeout(() => frame.remove(), 1000); } };
  if (d.readyState === 'complete') setTimeout(fire, 50);
  else w.addEventListener('load', () => setTimeout(fire, 50), { once: true });
}

/** Test seam for the no-gate fallback (mirrors the shell's own `iframePrint` injection). */
export interface PrintBarcodeDeps {
  iframePrint?: (html: string) => void;
}

/** Prints the product's SKU barcode through the print cascade (gate → iframe → dialog). */
export function printBarcodeLabel(sku: string, name: string, deps: PrintBarcodeDeps = {}): void {
  const html = barcodeLabelHtml(sku, name);
  const sdk = (globalThis as { erplora?: { print?: (r: Record<string, unknown>) => Promise<unknown> } }).erplora;
  if (sdk?.print) void sdk.print({ role: 'label', documentType: 'label', html, jobId: `barcode-${sku}` });
  else if (html) (deps.iframePrint ?? printHtmlInIframe)(html);
  else window.print();
}
