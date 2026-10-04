// The REFERENCE of a stock movement as the person reads it (inventory#137).
//
// A `sale` movement (and the `void` that reverses it) stores the sale's UUID in `reference`. That
// value is not for people: it is the key `commands/_restock_on_void_movement.sql` matches the void
// against, so it stays as it is in the row. What the person looking at Movements matches a line
// against is the DOCUMENT she can find in Sales or on the paper — the receipt or invoice number, or,
// with no invoicing app, the sale's own number. Same chain as cash_register#89.

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
