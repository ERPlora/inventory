// Contrato del DINERO en el CRUD de productos.
//
// El precio es un INTEGER en CÉNTIMOS (ADR-0007: `price INTEGER -- céntimos`). Eso obliga a que la
// entrada y la salida cuadren, y aquí no cuadraban:
//
//   · SALIDA: la lista y el detalle formateaban con `formatAmount()`, que NO divide entre 100 (es
//     para importes que ya llegan en euros). Un café de 220 céntimos se pintaba «220,00 €».
//   · ENTRADA: el input es `type="number" step="0.01"` —o sea, EUROS— pero el submit mandaba
//     `Number(this.newPrice)` en crudo: teclear 2,20 guardaba **2 céntimos**.
//
// Arreglar solo la salida sería peor que no arreglar nada: la lista pintaría «0,02 €» tan tranquila
// y el error pasaría desapercibido. Por eso los dos lados se fijan aquí juntos.
import { beforeEach, describe, expect, it } from 'vitest';

/** Comandos que el WC manda al dispatcher, para poder afirmar QUÉ se guarda. */
const comandos: { name: string; payload: Record<string, unknown> }[] = [];

beforeEach(() => {
  comandos.length = 0;
  // El doble imita el contrato del CLIENTE (`ErploraClient`), no el del transporte: `query()` pasa
  // la respuesta por `unwrapPage()`, así que a quien la llama le llega ya el ARRAY. Devolver aquí
  // el sobre `{rows}` en crudo sería un doble infiel — y de hecho lo era: escondía que el
  // componente hacía `.map()` sobre un objeto.
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) =>
      name === 'inventory.products.list'
        ? [{ id: 'p1', name: 'Café solo', sku: 'CAF', price: 220, stock: 10, is_active: 1 }]
        : [],
    queryPage: async (name: string) =>
      name === 'inventory.products.list'
        ? {
            rows: [{ id: 'p1', name: 'Café solo', sku: 'CAF', price: 220, stock: 10, is_active: 1 }],
            total: 1,
            limit: 50,
            offset: 0,
          }
        : { rows: [], total: 0, limit: 50, offset: 0 },
    command: async (name: string, payload: Record<string, unknown>) => {
      comandos.push({ name, payload });
      return {};
    },
    currency: 'EUR',
    // Contrato REAL del SDK: formatMoney recibe CÉNTIMOS y divide; formatAmount recibe EUROS.
    formatMoney: (cents: number) => `${((cents || 0) / 100).toFixed(2)} €`,
    formatAmount: (units: number) => `${(units || 0).toFixed(2)} €`,
    t: (_catalog: unknown, key: string) => key,
    loadSlot: async () => [],
  };
});

async function montar() {
  await import('./erp-inventory-products');
  const el = document.createElement('erp-inventory-products');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as HTMLElement & { updateComplete: Promise<unknown> };
}

describe('el selector de categoría fiscal es best-effort (ADR-0085)', () => {
  // `taxes` es una DEPENDENCIA BLANDA: puede no estar instalado, no tener permiso, o contestar algo
  // que no es una lista. En cualquiera de esos casos el select se queda con "sin categoría" y el
  // alta sigue funcionando. Lo que NO puede pasar es que la página de productos se caiga entera.
  it('si `taxes` no devuelve una lista, la página sigue en pie (no revienta el render)', async () => {
    (globalThis as Record<string, unknown>).erplora = {
      ...(globalThis as Record<string, { erplora: unknown }> & { erplora: object }).erplora,
      query: async (name: string) =>
        name === 'inventory.products.list'
          ? [{ id: 'p1', name: 'Café solo', sku: 'CAF', price: 220, stock: 10, is_active: 1 }]
          : ({ error: 'unknown_query' } as unknown), // taxes no instalado → NO es un array
    };
    const el = await montar();
    expect(el.shadowRoot, 'el componente ha renderizado pese a la respuesta rara').not.toBeNull();
    expect((el as unknown as { taxCategories: unknown }).taxCategories).toEqual([]);
  });
});

describe('precios del CRUD de productos (dinero = céntimos, ADR-0007)', () => {
  it('SALIDA: 220 céntimos se formatean 2,20 € (formatMoney, no formatAmount)', async () => {
    const el = await montar();
    // La columna `price` de la tabla declara su propio `format` — es ahí donde estaba el ×100.
    const cols = (el as unknown as { columns: { key: string; format?: (r: unknown) => string }[] }).columns;
    const colPrecio = cols.find((c) => c.key === 'price');
    expect(colPrecio?.format?.({ price: 220 }), 'la lista pinta el precio ×100').toBe('2.20 €');
  });

  it('ENTRADA: teclear 2,20 € guarda 220 céntimos (no 2)', async () => {
    const el = await montar();
    const wc = el as unknown as { newName: string; newSku: string; newPrice: string;
                                  createProduct: (ev: Event) => Promise<void> };
    wc.newName = 'Café solo';
    wc.newSku = 'CAF';
    wc.newPrice = '2.20'; // lo que teclea el usuario en un input `step="0.01"` = EUROS
    await wc.createProduct(new Event('submit'));

    const alta = comandos.find((c) => c.name === 'inventory.products.create');
    expect(alta, 'no se mandó el alta de producto').toBeTruthy();
    expect(alta!.payload.price, '2,20 € deben guardarse como 220 céntimos').toBe(220);
  });

  it('ENTRADA: los céntimos no se pierden por redondeo (0,05 € → 5)', async () => {
    const el = await montar();
    const wc = el as unknown as { newName: string; newSku: string; newPrice: string;
                                  createProduct: (ev: Event) => Promise<void> };
    wc.newName = 'Bolsa';
    wc.newSku = 'BOL';
    wc.newPrice = '0.05';
    await wc.createProduct(new Event('submit'));

    expect(comandos.at(-1)!.payload.price).toBe(5);
  });
});

// El CSV es la OTRA entrada de productos, y es la del onboarding real: el cliente llega con su
// listado de precios en euros («2,20»), no en céntimos. El formulario ya convertía; el import NO,
// así que el mismo catálogo entraba con precios ÷100 — un café a 2 céntimos. Es la misma frontera
// euros↔céntimos, y por eso pasa por la misma función.
describe('import CSV de productos (misma frontera euros↔céntimos)', () => {
  async function importar(rows: Record<string, string>[]) {
    const el = await montar();
    const wc = el as unknown as { onCsvImport: (ev: CustomEvent) => Promise<void> };
    await wc.onCsvImport(new CustomEvent('csv-import', { detail: { rows } }));
    return comandos.filter((c) => c.name === 'inventory.products.create');
  }

  it('un CSV en euros («2.20») guarda 220 céntimos, no 2', async () => {
    const altas = await importar([{ name: 'Café solo', sku: 'CAF', price: '2.20', stock: '10' }]);
    expect(altas, 'no se creó el producto del CSV').toHaveLength(1);
    expect(altas[0].payload.price, '2,20 € deben guardarse como 220 céntimos').toBe(220);
  });

  it('el coste sigue la misma regla («1.05» → 105 céntimos)', async () => {
    const altas = await importar([{ name: 'Bolsa', sku: 'BOL', price: '0.30', cost: '1.05' }]);
    expect(altas[0].payload.cost).toBe(105);
    expect(altas[0].payload.price).toBe(30);
  });

  it('la CANTIDAD no es dinero: el stock del CSV no se multiplica por 100', async () => {
    const altas = await importar([{ name: 'Café solo', sku: 'CAF', price: '2.20', stock: '10' }]);
    expect(altas[0].payload.stock, 'stock es una cantidad, no céntimos').toBe(10);
  });

  it('un precio vacío o basura entra como 0, no como NaN', async () => {
    const altas = await importar([{ name: 'Sin precio', sku: 'NOP', price: '' }]);
    expect(altas[0].payload.price).toBe(0);
  });
});

describe('el DETALLE de producto usa el mismo formateador que la lista (inventory#9)', () => {
  // La lista ya formatea céntimos con `formatMoney`; el detalle seguía con `formatAmount`
  // (no divide) → un café de 220 céntimos se pintaba «220,00 €» en la ficha.
  it('el precio del detalle se pinta con formatMoney: 220 céntimos → 2.20 €', async () => {
    const el = await montar();
    const wc = el as unknown as {
      detail: Record<string, unknown> | null;
      updateComplete: Promise<unknown>;
      shadowRoot: ShadowRoot;
    };
    wc.detail = { id: 'p1', name: 'Café solo', sku: 'CAF', price: 220, stock: 10, is_active: 1 };
    await wc.updateComplete;
    const texto = wc.shadowRoot.textContent ?? '';
    expect(texto, 'el detalle pinta céntimos como euros (×100)').not.toContain('220.00 €');
    expect(texto).toContain('2.20 €');
  });
});
