// inventory#137 — the Reference of a sale (or void) movement is the sale's UUID in the row: it is the
// key `_restock_on_void_movement.sql` matches the void against, so it stays as it is. What the person
// reads is the number of the DOCUMENT she holds — the receipt/invoice printed on the paper or, with no
// invoicing app, the sale's own number.
import { describe, expect, it } from 'vitest';
import {
  findSaleByDocumentNumber, movementReference, resolveSaleDocument, saleReferenceOf, withDocumentNumberSearch,
} from './movement-reference';

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

// inventory#142 — the person reads the document number in the Reference cell (inventory#137) and
// types THAT into the search box or the Reference filter. The row holds the sale's uuid, so the
// number is translated to its sale before the search reaches `inventory.stock.movements`.
const OTHER_SALE = '9c1d7f0e-2b3a-4c5d-8e9f-0a1b2c3d4e5f';

type Answer = (params: Record<string, unknown> | undefined) => unknown;

function lookupSdk(answers: Record<string, Answer | Error | undefined>, seen: [string, unknown][] = []): Sdk {
  return {
    queryOptional: async (name: string, params?: Record<string, unknown>) => {
      seen.push([name, params]);
      const a = answers[name];
      if (a instanceof Error) throw a;
      return a ? a(params) : undefined;
    },
  } as unknown as Sdk;
}

const page = (rows: unknown[]) => ({ rows, total: rows.length, limit: 20, offset: 0 });

describe('the sale a typed document number names (inventory#142)', () => {
  it('a receipt or invoice number names the sale the invoice was issued for', async () => {
    const seen: [string, unknown][] = [];
    const sdk = lookupSdk({
      'invoice.list': (p) => page(p?.f_number === 'T2026-000012' ? [{ id: 'inv-1', number: 'T2026-000012', source_type: 'sale' }] : []),
      'invoice.get': (p) => (p?.invoice_id === 'inv-1' ? [{ id: 'inv-1', source_type: 'sale', source_id: SALE_ID }] : []),
    }, seen);
    expect(await findSaleByDocumentNumber(sdk, 'T2026-000012')).toBe(SALE_ID);
    expect(seen[0]).toEqual(['invoice.list', { f_number: 'T2026-000012', limit: 20 }]);
  });

  it('the sale number names its sale, matched exactly (the sales filter is a substring match)', async () => {
    const sdk = lookupSdk({
      'invoice.list': () => page([]),
      'sales.list': () => page([
        { id: OTHER_SALE, sale_number: '20261004-00021' },
        { id: SALE_ID, sale_number: '20261004-0002' },
      ]),
    });
    expect(await findSaleByDocumentNumber(sdk, ' 20261004-0002 ')).toBe(SALE_ID);
    expect(await findSaleByDocumentNumber(sdk, '0002')).toBeNull();
  });

  it('an invoice that does not come from a sale (a substitution) names no sale', async () => {
    const sdk = lookupSdk({
      'invoice.list': () => page([{ id: 'inv-9', number: 'F3-1', source_type: 'substitution' }]),
      'invoice.get': () => [{ id: 'inv-9', source_type: 'substitution', source_id: 'inv-1' }],
      'sales.list': () => page([]),
    });
    expect(await findSaleByDocumentNumber(sdk, 'F3-1')).toBeNull();
  });

  it('without the invoicing or the sales app, or without permission to read them, it is null (no throw)', async () => {
    expect(await findSaleByDocumentNumber(lookupSdk({}), '20261004-0002')).toBeNull();
    const denied = lookupSdk({ 'invoice.list': new Error('forbidden'), 'sales.list': new Error('forbidden') });
    expect(await findSaleByDocumentNumber(denied, '20261004-0002')).toBeNull();
    const salesOnly = lookupSdk({ 'invoice.list': new Error('forbidden'), 'sales.list': () => page([{ id: SALE_ID, sale_number: '20261004-0002' }]) });
    expect(await findSaleByDocumentNumber(salesOnly, '20261004-0002')).toBe(SALE_ID);
  });

  it('text with no digit is not a document number and asks nobody', async () => {
    const seen: [string, unknown][] = [];
    expect(await findSaleByDocumentNumber(lookupSdk({}, seen), 'Café')).toBeNull();
    expect(await findSaleByDocumentNumber(lookupSdk({}, seen), '   ')).toBeNull();
    expect(seen).toEqual([]);
  });
});

describe('the movements search finds a sale by its document number (inventory#142)', () => {
  function listClient(answers: Record<string, Answer | Error | undefined>) {
    const pages: [string, unknown][] = [];
    const lookups: string[] = [];
    const base = lookupSdk(answers);
    const client = {
      queryOptional: (n: string, p?: Record<string, unknown>) => { lookups.push(n); return base.queryOptional(n, p); },
      queryPage: async (name: string, params: unknown) => { pages.push([name, params]); return page([]); },
    };
    return { client, pages, lookups };
  }
  const bySaleNumber = { 'sales.list': () => page([{ id: SALE_ID, sale_number: '20261004-0002' }]) };

  it('the search box: a document number goes to the server as the sale it names', async () => {
    const { client, pages } = listClient(bySaleNumber);
    await withDocumentNumberSearch(client).queryPage('inventory.stock.movements', { search: '20261004-0002', limit: 50, offset: 0 });
    expect(pages).toEqual([['inventory.stock.movements', { search: SALE_ID, limit: 50, offset: 0 }]]);
  });

  it('the Reference filter: same translation, other filters untouched', async () => {
    const { client, pages } = listClient(bySaleNumber);
    await withDocumentNumberSearch(client).queryPage('inventory.stock.movements', {
      filters: { reference: '20261004-0002', movement_type: 'void' },
    });
    expect(pages[0][1]).toEqual({ filters: { reference: SALE_ID, movement_type: 'void' } });
  });

  it('what names no sale (a product, a delivery note) is searched as typed', async () => {
    const { client, pages } = listClient({ 'sales.list': () => page([]), 'invoice.list': () => page([]) });
    await withDocumentNumberSearch(client).queryPage('inventory.stock.movements', {
      search: 'ALB-2026-000123', filters: { reference: 'ALB-2026-000123' },
    });
    expect(pages[0][1]).toEqual({ search: 'ALB-2026-000123', filters: { reference: 'ALB-2026-000123' } });
  });

  it('a number is looked up once for the life of the view, not on every page', async () => {
    const { client, lookups } = listClient(bySaleNumber);
    const searching = withDocumentNumberSearch(client);
    await searching.queryPage('inventory.stock.movements', { search: '20261004-0002', offset: 0 });
    await searching.queryPage('inventory.stock.movements', { search: '20261004-0002', offset: 50 });
    expect(lookups.filter((n) => n === 'sales.list')).toHaveLength(1);
  });
});
