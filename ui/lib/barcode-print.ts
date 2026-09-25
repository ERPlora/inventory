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
import { minorToMajor } from './hub-currency.js';

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
  /**
   * Are we inside the INSTALLED app? Injected for tests; by default it probes the same global the
   * shell probes (`window.__TAURI__.core.invoke`, `hub/apps/web/src/lib/device.ts`). It matters
   * because the browser fallback is a **false success** there: the webview has no print dialog.
   */
  isInstalledApp?: () => boolean;
}

/** What goes on the label. Money in MINOR units of the hub currency, like everywhere else in the
 *  module (ADR-0007/0123): cents in EUR, yen in JPY, fils in KWD. */
export interface BarcodeLabel {
  sku: string;
  name: string;
  /** Shelf price in **minor units**, or nothing to leave the price off the label. */
  priceCents?: number | null;
}

/**
 * How the print ended, so the caller can SAY it (issue #44). The old `void sdk.print(...)` threw
 * this away: a refused document type, an empty label or a missing printer all looked identical to
 * a clean print — nothing on screen, nothing on paper.
 */
export interface BarcodePrintOutcome {
  /** `false` = nothing came out of a printer and the user MUST be told. */
  ok: boolean;
  /** Route taken: the gate's `via` (`bridge`/`queue`/`browser`/`none`) or `iframe` with no gate. */
  via: string;
  /** Machine-readable cause; the caller maps it to a translated message. */
  reason?: 'no_printer' | 'gate_error' | 'threw';
  /** Technical detail from the gate, for the tail of that message. */
  detail?: string;
}

/**
 * The document the THERMAL path prints. The gate forwards `req.data` (not `req.html`) to
 * `peripherals.print`, and `render_barcode_label` (`hub/crates/peripherals/src/escpos.rs`) reads
 * exactly three keys: `product_name` (title), `barcode` (the GS k symbol) and an optional `price`.
 *
 * `price` goes in MAJOR units: the renderer prints the number with no scaling, so minor units
 * would turn a 2,20 € coffee into a 220 € one. The minor unit is the HUB currency's (inventory#101):
 * a fixed `/ 100` printed a 480 ¥ tea as «5» and 1.234 KWD as 12.34.
 */
export function barcodeLabelData(label: BarcodeLabel): Record<string, unknown> {
  const data: Record<string, unknown> = { product_name: label.name, barcode: label.sku };
  if (label.priceCents != null && Number.isFinite(Number(label.priceCents))) {
    data.price = minorToMajor(Number(label.priceCents));
  }
  return data;
}

/** True inside the installed app (Tauri shell), where there is no print dialog to fall back to. */
function runningInInstalledApp(): boolean {
  const g = globalThis as { __TAURI__?: { core?: { invoke?: unknown } } };
  return typeof g.__TAURI__?.core?.invoke === 'function';
}

/** Prints the product's barcode label through the print cascade (gate → iframe → dialog). */
export async function printBarcodeLabel(
  label: BarcodeLabel,
  deps: PrintBarcodeDeps = {},
): Promise<BarcodePrintOutcome> {
  const html = barcodeLabelHtml(label.sku, label.name);
  const sdk = (
    globalThis as {
      erplora?: { print?: (r: Record<string, unknown>) => Promise<{ via?: string; error?: string } | undefined> };
    }
  ).erplora;

  if (sdk?.print) {
    let result: { via?: string; error?: string } | undefined;
    try {
      result = await sdk.print({
        role: 'label',
        // Closed vocabulary (`DocumentType::parse`, `_ => return None`): `label` was refused AFTER
        // crossing the gate, which is why the button looked like it worked and never printed.
        documentType: 'barcode_label',
        data: barcodeLabelData(label),
        html,
        jobId: `barcode-${label.sku}`,
      });
    } catch (e) {
      return { ok: false, via: 'none', reason: 'threw', detail: e instanceof Error ? e.message : String(e) };
    }
    const via = result?.via ?? 'none';
    // Printed, or queued for a print host to drain: the job is not lost either way.
    if (via === 'bridge' || via === 'queue') return { ok: true, via };
    if (via === 'browser') {
      const installed = (deps.isInstalledApp ?? runningInInstalledApp)();
      // In a browser the dialog really opens; in the installed app it resolves and prints NOTHING.
      return installed
        ? { ok: false, via, reason: 'no_printer', detail: result?.error }
        : { ok: true, via };
    }
    return { ok: false, via, reason: 'gate_error', detail: result?.error };
  }

  if (html) {
    (deps.iframePrint ?? printHtmlInIframe)(html);
    return { ok: true, via: 'iframe' };
  }
  window.print();
  return { ok: true, via: 'browser' };
}
