// inventory#137 — the Reference of a sale (or void) movement is the sale's UUID in the row: it is the
// key `_restock_on_void_movement.sql` matches the void against, so it stays as it is. What the person
// reads is the number of the DOCUMENT she holds — the receipt/invoice printed on the paper or, with no
// invoicing app, the sale's own number.
import { describe, expect, it } from 'vitest';
import { movementReference, resolveSaleDocument, saleReferenceOf } from './movement-reference';

const SALE_ID = '3750546f-c61b-4731-a1f2-2a64ec1ce824';

describe('what the Reference cell prints (inventory#137)', () => {
  it('a sale or a void prints the number of its document, never the uuid', () => {
    const doc = { kind: 'receipt' as const, number: 'F2-2026-000012' };
    expect(movementReference({ movement_type: 'sale', reference: SALE_ID }, doc)).toBe('F2-2026-000012');
    expect(movementReference({ movement_type: 'void', reference: SALE_ID }, doc)).toBe('F2-2026-000012');
  });

  it('while resolving, or when nothing could be resolved, a sale uuid is not printed', () => {
    expect(movementReference({ movement_type: 'sale', reference: SALE_ID }, undefined)).toBe('');
    expect(movementReference({ movement_type: 'void', reference: SALE_ID }, null)).toBe('');
  });

  it('a reference that is not a uuid (an API caller\'s own document) is still printed when unresolved', () => {
    expect(movementReference({ movement_type: 'sale', reference: 'ORDER-55' }, null)).toBe('ORDER-55');
  });

  it('every other movement prints what was typed (a delivery note number)', () => {
    const doc = { kind: 'sale' as const, number: 'NOPE' };
    expect(movementReference({ movement_type: 'reception', reference: 'ALB-2026-000123' }, doc)).toBe('ALB-2026-000123');
    expect(movementReference({ movement_type: 'count', reference: null }, undefined)).toBe('');
  });

  it('only sale and void movements name a sale to resolve', () => {
    expect(saleReferenceOf({ movement_type: 'sale', reference: SALE_ID })).toBe(SALE_ID);
    expect(saleReferenceOf({ movement_type: 'void', reference: SALE_ID })).toBe(SALE_ID);
    expect(saleReferenceOf({ movement_type: 'reception', reference: 'ALB-1' })).toBe('');
    expect(saleReferenceOf({ movement_type: 'decrease', reference: null })).toBe('');
    expect(saleReferenceOf({ movement_type: 'sale', reference: null })).toBe('');
  });
});

type Sdk = Parameters<typeof resolveSaleDocument>[0];

function sdkWith(answers: Record<string, unknown>, calls: string[] = []): Sdk {
  const answer = async (name: string) => {
    calls.push(name);
    const a = answers[name];
    if (a instanceof Error) throw a;
    return a;
  };
  return { queryOptional: answer } as unknown as Sdk;
}

describe('which document the number comes from (inventory#137, same chain as cash_register#89)', () => {
  it('the invoice issued for the sale wins: F1/F3 invoice, F2 receipt', async () => {
    for (const [type, kind] of [['F1', 'invoice'], ['F3', 'invoice'], ['F2', 'receipt']] as const) {
      const sdk = sdkWith({ 'invoice.by_source': [{ id: 'i1', invoice_type: type, number: 'N-1' }] });
      expect(await resolveSaleDocument(sdk, SALE_ID)).toEqual({ kind, number: 'N-1' });
    }
  });

  it('asks the invoice app by the SALE (source_id = the movement reference)', async () => {
    const seen: [string, Record<string, unknown>][] = [];
    const sdk = { queryOptional: async (n: string, p: Record<string, unknown>) => { seen.push([n, p]); return n === 'invoice.by_source' ? [] : [{ sale_number: 'S' }]; } } as unknown as Sdk;
    await resolveSaleDocument(sdk, SALE_ID);
    expect(seen).toEqual([['invoice.by_source', { source_id: SALE_ID }], ['sales.get', { sale_id: SALE_ID }]]);
  });

  it('with no invoicing app (or no invoice yet) falls back to the sale number', async () => {
    const calls: string[] = [];
    const absent = sdkWith({ 'invoice.by_source': undefined, 'sales.get': [{ id: SALE_ID, sale_number: '20261004-0002' }] }, calls);
    expect(await resolveSaleDocument(absent, SALE_ID)).toEqual({ kind: 'sale', number: '20261004-0002' });
    expect(calls).toEqual(['invoice.by_source', 'sales.get']);

    const pending = sdkWith({ 'invoice.by_source': [], 'sales.get': [{ sale_number: '20261004-0003' }] });
    expect(await resolveSaleDocument(pending, SALE_ID)).toEqual({ kind: 'sale', number: '20261004-0003' });
  });

  it('a role that cannot read invoices still gets the sale number', async () => {
    const sdk = sdkWith({ 'invoice.by_source': new Error('forbidden'), 'sales.get': [{ sale_number: '20261004-0004' }] });
    expect(await resolveSaleDocument(sdk, SALE_ID)).toEqual({ kind: 'sale', number: '20261004-0004' });
  });

  it('when nothing answers it returns null, without throwing', async () => {
    expect(await resolveSaleDocument(sdkWith({ 'invoice.by_source': new Error('x'), 'sales.get': new Error('y') }), SALE_ID)).toBeNull();
    expect(await resolveSaleDocument(sdkWith({ 'invoice.by_source': undefined, 'sales.get': undefined }), SALE_ID)).toBeNull();
  });
});
