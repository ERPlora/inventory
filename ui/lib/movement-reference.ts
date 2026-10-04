// The REFERENCE of a stock movement as the person reads it (inventory#137).
//
// A `sale` movement (and the `void` that reverses it) stores the sale's UUID in `reference`. That
// value is not for people: it is the key `commands/_restock_on_void_movement.sql` matches the void
// against, so it stays as it is in the row. What the person looking at Movements matches a line
// against is the DOCUMENT she can find in Sales or on the paper — the receipt or invoice number, or,
// with no invoicing app, the sale's own number. Same chain as cash_register#89.

import type { ListPage, ListParams } from '@erplora/module-sdk';

/** The document a sale produced: an invoice (F1/F3), a receipt (F2, simplified invoice) or — with
 *  no invoicing app — the sale itself. */
export interface SaleDocument {
  kind: 'invoice' | 'receipt' | 'sale';
  number: string;
}

export interface MovementLike {
  movement_type?: unknown;
  reference?: unknown;
}

const SALE_MOVEMENTS = new Set(['sale', 'void']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The sale a movement names, or '' when it names none (only `sale` and `void` movements do). */
export function saleReferenceOf(row: MovementLike): string {
  const reference = row.reference == null ? '' : String(row.reference);
  return reference && SALE_MOVEMENTS.has(String(row.movement_type ?? '')) ? reference : '';
}

/**
 * What the Reference cell prints. `doc` is the resolved document of the row's sale: `undefined`
 * while it is being resolved, `null` when none could be. A sale's UUID is never printed — the Type
 * column already says «Sale»/«Void» — but a reference an API caller wrote itself is.
 */
export function movementReference(row: MovementLike, doc: SaleDocument | null | undefined): string {
  const reference = row.reference == null ? '' : String(row.reference);
  if (!saleReferenceOf(row)) return reference;
  if (doc) return doc.number;
  return UUID.test(reference) ? '' : reference;
}

interface OptionalQueryClient {
  queryOptional<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T | undefined>;
}

function firstRow(rows: unknown): Record<string, unknown> | undefined {
  const row = Array.isArray(rows) ? rows[0] : rows;
  return row && typeof row === 'object' ? (row as Record<string, unknown>) : undefined;
}

/**
 * The document of one sale. Neither `invoice` nor `sales` is a dependency of this module, so both
 * are asked through `queryOptional` and every failure degrades to the next source: the invoice
 * (`invoice.by_source`) → the sale's number (`sales.get`) → `null`. A missing app, an invoice not
 * issued yet or a role without permission to read invoices all end on the sale number.
 */
export async function resolveSaleDocument(sdk: OptionalQueryClient, saleId: string): Promise<SaleDocument | null> {
  try {
    const invoice = firstRow(await sdk.queryOptional('invoice.by_source', { source_id: saleId }));
    const number = invoice?.number == null ? '' : String(invoice.number);
    if (number) return { kind: invoice?.invoice_type === 'F2' ? 'receipt' : 'invoice', number };
  } catch {
    // No permission to read invoices / broken contract: the sale number still identifies it.
  }
  try {
    const sale = firstRow(await sdk.queryOptional('sales.get', { sale_id: saleId }));
    const number = sale?.sale_number == null ? '' : String(sale.sale_number);
    if (number) return { kind: 'sale', number };
  } catch {
    // Nothing else to ask: the cell stays empty rather than printing the UUID.
  }
  return null;
}

// ── Searching by the number the person reads (inventory#142) ───────────────────────────────────
//
// The Reference cell prints the document number, but the row (and so the server search and the
// `reference` filter of `inventory.stock.movements`) only holds the sale's uuid. So a typed number
// is translated to the sale it names BEFORE the search leaves the view — the same two sources the
// cell reads, in the same order: the invoice issued for the sale, then the sale's own number.

const DOCUMENT_LOOKUP_LIMIT = 20;

function rowsOf(answer: unknown): Record<string, unknown>[] {
  const rows = Array.isArray(answer) ? answer : (answer as { rows?: unknown } | undefined)?.rows;
  return Array.isArray(rows) ? rows.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object') : [];
}

const textOf = (v: unknown): string => (v == null ? '' : String(v));

/** The sale of the invoice (receipt) numbered `number`, or '' — only an invoice issued FROM a sale. */
async function saleOfInvoiceNumber(sdk: OptionalQueryClient, number: string): Promise<string> {
  const invoices = rowsOf(await sdk.queryOptional('invoice.list', { f_number: number, limit: DOCUMENT_LOOKUP_LIMIT }));
  for (const invoice of invoices) {
    if (textOf(invoice.source_type) !== 'sale') continue;
    // `invoice.list` does not project `source_id`: the invoice itself says which sale it was issued for.
    const saleId = textOf(firstRow(await sdk.queryOptional('invoice.get', { invoice_id: invoice.id }))?.source_id);
    if (saleId) return saleId;
  }
  return '';
}

/** The sale numbered exactly `number`, or '' (`sales.list` filters `sale_number` as a substring). */
async function saleOfSaleNumber(sdk: OptionalQueryClient, number: string): Promise<string> {
  const sales = rowsOf(await sdk.queryOptional('sales.list', { f_sale_number: number, limit: DOCUMENT_LOOKUP_LIMIT }));
  return textOf(sales.find((s) => textOf(s.sale_number) === number)?.id);
}

/**
 * The sale a typed document number names — a receipt/invoice number or a sale number — or `null`.
 * Text with no digit is no document number and asks nobody. Like {@link resolveSaleDocument}, a
 * missing app or a role that cannot read it falls through to the next source, and never throws.
 */
export async function findSaleByDocumentNumber(sdk: OptionalQueryClient, typed: string): Promise<string | null> {
  const number = typed.trim();
  if (!/\d/.test(number)) return null;
  for (const source of [saleOfInvoiceNumber, saleOfSaleNumber]) {
    try {
      const saleId = await source(sdk, number);
      if (saleId) return saleId;
    } catch {
      // No permission / broken contract on this source: the next one may still name the sale.
    }
  }
  return null;
}

interface MovementListClient extends OptionalQueryClient {
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
}

/**
 * The list client of the Movements view: a search or a Reference filter that is a document number
 * goes to the server as the uuid of the sale it names, which is what the row holds — so the sale
 * and its void both match. What names no sale (a product, a delivery note) goes as typed. Each
 * typed text is looked up once for the life of the view.
 */
export function withDocumentNumberSearch(client: MovementListClient): MovementListClient {
  const known = new Map<string, Promise<string | null>>();
  const saleOf = (typed: unknown): Promise<string | null> => {
    const text = textOf(typed);
    if (!known.has(text)) known.set(text, findSaleByDocumentNumber(client, text));
    return known.get(text)!;
  };
  // Both doors only pass on the name they receive: the literal lives at the call site
  // (`createListController(withDocumentNumberSearch(erplora()), 'inventory.stock.movements', …)`),
  // where `erplora contracts` already records it (ADR-0127).
  return {
    // erplora-contracts: ignore — pass-through, see above.
    queryOptional: (name, params) => client.queryOptional(name, params),
    async queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>> {
      const out: ListParams = { ...params };
      if (params.search) out.search = (await saleOf(params.search)) ?? params.search;
      const reference = params.filters?.reference;
      if (reference) out.filters = { ...params.filters, reference: (await saleOf(reference)) ?? reference };
      // erplora-contracts: ignore — pass-through, see above.
      return client.queryPage<R>(name, out);
    },
  };
}
