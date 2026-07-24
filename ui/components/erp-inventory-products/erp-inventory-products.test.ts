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
        ? [{ id: 'p1', name: 'Café solo', sku: 'CAF', price: 220, stock: 10_000_000, unit_code: 'ud', is_active: 1 }]
        : [],
    queryPage: async (name: string) =>
      name === 'inventory.products.list'
        ? {
            rows: [{ id: 'p1', name: 'Café solo', sku: 'CAF', price: 220, stock: 10_000_000, unit_code: 'ud', is_active: 1 }],
            total: 1,
            limit: 50,
            offset: 0,
          }
        : { rows: [], total: 0, limit: 50, offset: 0 },
    command: async (name: string, payload: Record<string, unknown>) => {
      comandos.push({ name, payload });
      return {};
    },
    hasPermission: () => true,
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
          ? [{ id: 'p1', name: 'Café solo', sku: 'CAF', price: 220, stock: 10_000_000, unit_code: 'ud', is_active: 1 }]
          : ({ error: 'unknown_query' } as unknown), // taxes no instalado → NO es un array
    };
    const el = await montar();
    expect(el.shadowRoot, 'el componente ha renderizado pese a la respuesta rara').not.toBeNull();
    expect((el as unknown as { taxCategories: unknown }).taxCategories).toEqual([]);
  });
});

describe('permisos visibles del CRUD', () => {
  it('la lectura sola oculta altas, importación, exportación y mutaciones de fila', async () => {
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.hasPermission = () => false;
    const el = await montar();
    const table = el.shadowRoot?.querySelector('ok-data-table') as HTMLElement & {
      addable: boolean;
      importable: boolean;
      exportable: boolean;
      actions: Array<{ id: string }>;
    };
    expect(table.addable).toBe(false);
    expect(table.importable).toBe(false);
    expect(table.exportable).toBe(false);
    expect(table.actions.map((action) => action.id)).toEqual(['detail']);
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

  it('la CANTIDAD usa su propia escala 10⁶ (no céntimos)', async () => {
    const altas = await importar([{ name: 'Café solo', sku: 'CAF', price: '2.20', stock: '10' }]);
    expect(altas[0].payload.stock, '10 unidades viajan como 10.000.000 µ').toBe(10_000_000);
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
    wc.detail = { id: 'p1', name: 'Café solo', sku: 'CAF', price: 220, stock: 10_000_000, is_active: 1 };
    await wc.updateComplete;
    const texto = wc.shadowRoot.textContent ?? '';
    expect(texto, 'el detalle pinta céntimos como euros (×100)').not.toContain('220.00 €');
    expect(texto).toContain('2.20 €');
  });
});

describe('recepción y recuento desde la tabla (inventory#7)', () => {
  it('las filas ofrecen las acciones receive y count', async () => {
    const el = await montar();
    const acts = (el as unknown as { actions: { id: string }[] }).actions.map((a) => a.id);
    expect(acts).toContain('receive');
    expect(acts).toContain('count');
  });

  it('el recuento muestra la DIFERENCIA antes de aplicar y manda adjust ABSOLUTO con motivo', async () => {
    const el = await montar();
    const wc = el as unknown as {
      countTarget: Record<string, unknown> | null; countValue: string; countReason: string;
      countDifference: number | null;
      submitCount: () => Promise<void>; updateComplete: Promise<unknown>;
    };
    wc.countTarget = { id: 'p1', name: 'Café solo', sku: 'CAF', stock: 10_000_000, unit_code: 'ud' };
    wc.countValue = '7';
    await wc.updateComplete;
    expect(wc.countDifference, 'la diferencia se enseña ANTES de aplicar (#7)').toBe(-3);

    wc.countReason = 'recuento semanal';
    await wc.submitCount();
    const adj = comandos.find((c) => c.name === 'inventory.stock.adjust');
    expect(adj, 'no se mandó el ajuste').toBeTruthy();
    expect(adj!.payload.stock, 'el ajuste es ABSOLUTO en escala 10⁶').toBe(7_000_000);
    expect(adj!.payload.reason).toBe('recuento semanal');
  });

  it('el recuento sin motivo NO se envía (motivo obligatorio)', async () => {
    const el = await montar();
    const wc = el as unknown as {
      countTarget: Record<string, unknown> | null; countValue: string; countReason: string;
      submitCount: () => Promise<void>;
    };
    wc.countTarget = { id: 'p1', stock: 10_000_000, unit_code: 'ud' };
    wc.countValue = '7';
    wc.countReason = '';
    await wc.submitCount();
    expect(comandos.find((c) => c.name === 'inventory.stock.adjust')).toBeFalsy();
  });

  it('recibir mercancía manda qty en escala 10⁶ y coste en céntimos', async () => {
    const el = await montar();
    const wc = el as unknown as {
      receiveTarget: Record<string, unknown> | null; receiveQty: string; receiveCost: string;
      submitReceive: () => Promise<void>;
    };
    wc.receiveTarget = { id: 'p1', name: 'Café', sku: 'CAF', stock: 10_000_000, unit_code: 'kg' };
    wc.receiveQty = '2.5';
    wc.receiveCost = '1.80'; // euros tecleados → céntimos guardados (ADR-0007)
    await wc.submitReceive();
    const rec = comandos.find((c) => c.name === 'inventory.stock.receive');
    expect(rec, 'no se mandó la recepción').toBeTruthy();
    const item = (rec!.payload.items as Record<string, unknown>[])[0];
    expect(item.product_id).toBe('p1');
    expect(item.qty, '2,5 unidades → 2.500.000 µ').toBe(2_500_000);
    expect(item.unit_cost, '1,80 € → 180 céntimos').toBe(180);
  });
});

describe('cantidades de la UI en punto fijo 10⁶ (inventory#25)', () => {
  it('la lista convierte el valor persistido antes de pintarlo', async () => {
    const el = await montar();
    const cols = (el as unknown as {
      columns: { key: string; format?: (row: Record<string, unknown>) => string }[];
    }).columns;
    const stock = cols.find((column) => column.key === 'stock')!;
    expect(stock.format?.({ stock: 2_500_000 })).toBe('2.5');
  });

  it('el alta convierte stock y umbral lógicos a µ', async () => {
    const el = await montar();
    const wc = el as unknown as {
      newName: string; newSku: string; newPrice: string; newStock: string; newThreshold: string;
      newUnitCode: string; units: Record<string, unknown>[];
      createProduct: (ev: Event) => Promise<void>;
    };
    wc.newName = 'Harina';
    wc.newSku = 'HAR';
    wc.newPrice = '1.20';
    wc.newStock = '2.5';
    wc.newThreshold = '0.75';
    wc.newUnitCode = 'kg';
    wc.units = [{ code: 'kg', increment_value: 1_000, name: 'Kilogram', name_es: 'Kilogramo' }];
    await wc.createProduct(new Event('submit'));

    const alta = comandos.find((command) => command.name === 'inventory.products.create')!;
    expect(alta.payload.stock).toBe(2_500_000);
    expect(alta.payload.low_stock_threshold).toBe(750_000);
  });

  it('rechaza más de seis decimales y cantidades fuera del incremento sin redondear', async () => {
    const el = await montar();
    const wc = el as unknown as {
      receiveTarget: Record<string, unknown> | null; receiveQty: string; receiveCost: string;
      units: Record<string, unknown>[]; formError: string;
      submitReceive: () => Promise<void>;
    };
    wc.units = [{ code: 'kg', increment_value: 250_000, name: 'Kilogram', name_es: 'Kilogramo' }];
    wc.receiveTarget = { id: 'p1', stock: 1_000_000, unit_code: 'kg' };

    wc.receiveQty = '0.1234567';
    await wc.submitReceive();
    expect(comandos.find((command) => command.name === 'inventory.stock.receive')).toBeFalsy();
    expect(wc.formError).toBe('ui.errQuantity');

    wc.receiveQty = '0.2';
    await wc.submitReceive();
    expect(comandos.find((command) => command.name === 'inventory.stock.receive')).toBeFalsy();
    expect(wc.formError).toBe('ui.errQuantityGrid');
  });
});

describe('importador CSV: los errores se VEN, nunca parcial silencioso (inventory#13)', () => {
  async function importarConResultado(rows: Record<string, string>[]) {
    const el = await montar();
    const wc = el as unknown as {
      finalizeImport: (rows: Record<string, string>[], map: Map<string, string>) => Promise<void>;
      importReport: { total: number; created: number; skipped: number;
        failed: { line: number; sku: string; reason: string }[] } | null;
      updateComplete: Promise<unknown>;
    };
    await wc.finalizeImport(rows, new Map());
    return wc;
  }

  it('una fila inválida NO se traga: cuenta como fallida con su número de línea y motivo', async () => {
    const wc = await importarConResultado([
      { name: 'Café', sku: 'CAF-2', price: '2.20' },   // línea 1: válida
      { name: '', sku: '', price: '1.00' },             // línea 2: sin name/sku
      { name: 'Té', sku: 'TE-2', price: 'abc' },        // línea 3: precio no numérico
    ]);
    const rep = wc.importReport!;
    expect(rep, 'debe existir un informe visible').toBeTruthy();
    expect(rep.total).toBe(3);
    expect(rep.created).toBe(1);
    expect(rep.failed).toHaveLength(2);
    // Línea FÍSICA del fichero (la cabecera es la 1): filas de datos = índice + 2.
    expect(rep.failed[0].line).toBe(3);
    expect(rep.failed[1].line).toBe(4);
    expect(rep.failed[1].reason.length, 'motivo legible, no vacío').toBeGreaterThan(3);
    // Solo la fila válida llegó al dispatcher.
    expect(comandos.filter((c) => c.name === 'inventory.products.create')).toHaveLength(1);
  });

  it('SKU duplicado DENTRO del fichero: la segunda fila falla, no crea dos', async () => {
    const wc = await importarConResultado([
      { name: 'A', sku: 'DUP', price: '1.00' },
      { name: 'B', sku: 'DUP', price: '2.00' },
    ]);
    expect(wc.importReport!.created).toBe(1);
    expect(wc.importReport!.failed).toHaveLength(1);
    expect(wc.importReport!.failed[0].line).toBe(3);
  });

  it('duplicado en BD (UNIQUE del runtime) cuenta como OMITIDA, y el resto sigue', async () => {
    (globalThis as Record<string, unknown>).erplora = {
      ...(globalThis as { erplora: object }).erplora,
      command: async (name: string, payload: Record<string, unknown>) => {
        comandos.push({ name, payload });
        if (payload.sku === 'YA-EXISTE') throw new Error('UNIQUE constraint failed: inventory_product.sku');
        return {};
      },
    };
    const wc = await importarConResultado([
      { name: 'Nuevo', sku: 'NUEVO', price: '1.00' },
      { name: 'Viejo', sku: 'YA-EXISTE', price: '2.00' },
    ]);
    expect(wc.importReport!.created).toBe(1);
    expect(wc.importReport!.skipped, 'el duplicado de BD se OMITE (política definida), no se calla').toBe(1);
    expect(wc.importReport!.failed).toHaveLength(0);
  });

  it('el informe es copiable: texto con línea y motivo por fila fallida', async () => {
    const wc = await importarConResultado([
      { name: '', sku: '', price: '' },
    ]) as unknown as { importReportText: () => string };
    const texto = wc.importReportText();
    expect(texto).toContain('2'); // línea 2 (1 = cabecera del CSV)
    expect(texto.length).toBeGreaterThan(10);
  });
});

describe('edición REAL de productos (inventory#8)', () => {
  it('Editar carga la ficha completa (products.get) y el submit llama a UPDATE, no a create', async () => {
    (globalThis as Record<string, unknown>).erplora = {
      ...(globalThis as { erplora: object }).erplora,
      query: async (name: string) =>
        name === 'inventory.products.get'
          ? [{ id: 'p1', name: 'Café solo', sku: 'CAF', price: 220, cost: 90, stock: 10_000_000,
               low_stock_threshold: 5_000_000, ean13: '8412345678905', description: 'café de casa',
               tax_category_key: null, is_active: 1, product_type: 'physical', image: '' }]
          : name === 'inventory.product_categories'
            ? [{ product_id: 'p1', category_id: 'c1' }]
            : [],
    };
    const el = await montar();
    const wc = el as unknown as {
      onRowAction: (ev: CustomEvent) => Promise<void>;
      editingId: string | null; newName: string; newDescription: string; newEan: string;
      selectedCategoryIds: Set<string>;
      createProduct: (ev: Event) => Promise<void>; updateComplete: Promise<unknown>;
    };
    await wc.onRowAction(new CustomEvent('rowAction', {
      detail: { actionId: 'edit', row: { id: 'p1', name: 'Café solo', sku: 'CAF', price: 220 } },
    }) as CustomEvent);
    await wc.updateComplete;

    expect(wc.editingId, 'estado de edición técnico y visible').toBe('p1');
    expect(wc.newDescription, 'la ficha carga TODOS los campos (no solo 4)').toBe('café de casa');
    expect(wc.newEan).toBe('8412345678905');
    expect([...wc.selectedCategoryIds], 'las categorías actuales vienen pre-marcadas').toEqual(['c1']);

    await wc.createProduct(new Event('submit'));
    const upd = comandos.find((c) => c.name === 'inventory.products.update');
    expect(upd, 'el submit en modo edición debe llamar a update').toBeTruthy();
    expect(upd!.payload.product_id).toBe('p1');
    expect(upd!.payload.description).toBe('café de casa');
    expect(comandos.find((c) => c.name === 'inventory.products.create'),
      'NUNCA create en modo edición (el bug de #8)').toBeFalsy();
  });

  it('cancelar la edición limpia el estado: el siguiente alta no hereda datos', async () => {
    const el = await montar();
    const wc = el as unknown as {
      editingId: string | null; newName: string; cancelEdit: () => void;
    };
    wc.editingId = 'p1';
    wc.newName = 'Viejo';
    wc.cancelEdit();
    expect(wc.editingId).toBeNull();
    expect(wc.newName).toBe('');
  });

  it('la edición sincroniza el M2M: añade las categorías marcadas y quita las desmarcadas', async () => {
    const el = await montar();
    const wc = el as unknown as {
      editingId: string | null; newName: string; newSku: string; newPrice: string;
      selectedCategoryIds: Set<string>; initialCategoryIds: Set<string>;
      createProduct: (ev: Event) => Promise<void>;
    };
    wc.editingId = 'p1';
    wc.newName = 'Café';
    wc.newSku = 'CAF';
    wc.newPrice = '2.20';
    wc.initialCategoryIds = new Set(['c1']);
    wc.selectedCategoryIds = new Set(['c2']);
    await wc.createProduct(new Event('submit'));
    const added = comandos.find((c) => c.name === 'inventory.products.add_category');
    const removed = comandos.find((c) => c.name === 'inventory.products.remove_category');
    expect(added?.payload.category_id).toBe('c2');
    expect(removed?.payload.category_id).toBe('c1');
  });

  it('un SKU duplicado al crear se explica junto al formulario (no genérico)', async () => {
    (globalThis as Record<string, unknown>).erplora = {
      ...(globalThis as { erplora: object }).erplora,
      command: async () => { throw new Error('UNIQUE constraint failed: inventory_product.sku'); },
    };
    const el = await montar();
    const wc = el as unknown as {
      newName: string; newSku: string; newPrice: string; formError: string;
      createProduct: (ev: Event) => Promise<void>;
    };
    wc.newName = 'Café';
    wc.newSku = 'CAF';
    wc.newPrice = '2.20';
    await wc.createProduct(new Event('submit'));
    expect(wc.formError).toBe('ui.errSkuTaken');
  });
});

describe('selector de unidad maestra en la ficha (ADR-0147)', () => {
  // La incidencia: el registro de unidades existía (inventory.units.list) pero la ficha de
  // producto no lo exponía — la unidad solo podía fijarse por API. El selector es best-effort
  // como el de categorías fiscales: si units.list falla, el alta sigue con 'ud'.
  const unidades = [
    { id: 'u1', code: 'ud', name: 'Unit', name_es: 'Unidad', increment_value: 1_000_000 },
    { id: 'u2', code: 'kg', name: 'Kilogram', name_es: 'Kilogramo', increment_value: 1_000 },
  ];

  it('las unidades se cargan de inventory.units.list (queryAll) y la etiqueta es «Nombre (code)» según locale', async () => {
    (globalThis as Record<string, unknown>).erplora = {
      ...(globalThis as { erplora: object }).erplora,
      locale: 'es',
      queryAll: async (name: string) => (name === 'inventory.units.list' ? unidades : []),
    };
    const el = await montar();
    const wc = el as unknown as {
      units: { code: string }[];
      unitLabel: (u: Record<string, unknown>) => string;
    };
    expect(wc.units.map((u) => u.code)).toEqual(['ud', 'kg']);
    expect(wc.unitLabel(unidades[1]), 'locale es → name_es').toBe('Kilogramo (kg)');
    (globalThis as Record<string, { locale?: string }>).erplora.locale = 'en';
    expect(wc.unitLabel(unidades[1]), 'otro locale → name canónico').toBe('Kilogram (kg)');
  });

  it('ALTA: sin tocar el selector se envía unit_code "ud" (el default del contrato)', async () => {
    const el = await montar();
    const wc = el as unknown as { newName: string; newSku: string; newPrice: string;
                                  createProduct: (ev: Event) => Promise<void> };
    wc.newName = 'Caña';
    wc.newSku = 'CANA';
    wc.newPrice = '2.20';
    await wc.createProduct(new Event('submit'));
    const alta = comandos.find((c) => c.name === 'inventory.products.create');
    expect(alta!.payload.unit_code, 'el default explícito es ud').toBe('ud');
  });

  it('ALTA: elegir kg envía unit_code "kg"', async () => {
    const el = await montar();
    const wc = el as unknown as { newName: string; newSku: string; newPrice: string;
                                  newUnitCode: string; createProduct: (ev: Event) => Promise<void> };
    wc.newName = 'Gambas';
    wc.newSku = 'GAM';
    wc.newPrice = '12.00';
    wc.newUnitCode = 'kg';
    await wc.createProduct(new Event('submit'));
    expect(comandos.find((c) => c.name === 'inventory.products.create')!.payload.unit_code).toBe('kg');
  });

  it('EDICIÓN: la ficha carga la unidad actual y el update la envía SIEMPRE (seguro tras el COALESCE)', async () => {
    (globalThis as Record<string, unknown>).erplora = {
      ...(globalThis as { erplora: object }).erplora,
      query: async (name: string) =>
        name === 'inventory.products.get'
          ? [{ id: 'p1', name: 'Gambas', sku: 'GAM', price: 1200, cost: 0, stock: 0,
               low_stock_threshold: 5_000_000, ean13: null, description: '', tax_category_key: null,
               is_active: 1, product_type: 'physical', unit_code: 'kg' }]
          : [],
    };
    const el = await montar();
    const wc = el as unknown as {
      onRowAction: (ev: CustomEvent) => Promise<void>;
      newUnitCode: string; createProduct: (ev: Event) => Promise<void>; updateComplete: Promise<unknown>;
    };
    await wc.onRowAction(new CustomEvent('rowAction', {
      detail: { actionId: 'edit', row: { id: 'p1', name: 'Gambas', sku: 'GAM', price: 1200 } },
    }) as CustomEvent);
    await wc.updateComplete;
    expect(wc.newUnitCode, 'la ficha pre-carga la unidad de BD').toBe('kg');

    await wc.createProduct(new Event('submit'));
    const upd = comandos.find((c) => c.name === 'inventory.products.update');
    expect(upd!.payload.unit_code, 'el update la envía (cambiada o no: es idempotente)').toBe('kg');
  });

  it('EDICIÓN: cancelar limpia la unidad al default (el siguiente alta no hereda kg)', async () => {
    const el = await montar();
    const wc = el as unknown as { newUnitCode: string; cancelEdit: () => void };
    wc.newUnitCode = 'kg';
    wc.cancelEdit();
    expect(wc.newUnitCode).toBe('ud');
  });
});

describe('hallazgos del QA en navegador (07-16)', () => {
  it('cancelar la edición CIERRA el panel lateral (no lo deja abierto vacío)', async () => {
    const el = await montar();
    const wc = el as unknown as { editingId: string | null; cancelEdit: () => void };
    let cerrado = false;
    const table = (el as unknown as { renderRoot: ShadowRoot }).renderRoot.querySelector('ok-data-table') as
      | { close?: () => void }
      | null;
    if (table) table.close = () => { cerrado = true; };
    wc.editingId = 'p1';
    wc.cancelEdit();
    expect(cerrado, 'el drawer debe cerrarse al cancelar').toBe(true);
  });
});
