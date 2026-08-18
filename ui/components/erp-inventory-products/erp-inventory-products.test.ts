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
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

/** Comandos que el WC manda al dispatcher, para poder afirmar QUÉ se guarda. */
const comandos: { name: string; payload: Record<string, unknown> }[] = [];

/** Categoría fiscal del hub de pruebas. Desde inventory#38 NINGÚN producto se crea sin una. */
const CATEGORIA_FISCAL = { id: 't1', key: 'standard', name: 'Standard' };

// Raíz del módulo EN DISCO. No se deriva de `import.meta.url`: Vite lo entrega relativo a la raíz
// del workspace (`/modules/inventory/ui/…`, sin prefijo de disco) y `fileURLToPath` lo rechaza. Se
// prueban las dos raíces posibles y gana la que de verdad tenga un `module.json`.
const RAIZ_MODULO = [path.join(process.cwd(), 'modules/inventory'), process.cwd()].find((dir) =>
  existsSync(path.join(dir, 'module.json')),
)!;

/** Lee un fichero del módulo (schemas, SQL, manifest) para fijar contratos que no son de la UI. */
function ficheroDelModulo(rel: string): string {
  return readFileSync(path.join(RAIZ_MODULO, rel), 'utf8');
}

function jsonDelModulo(rel: string): Record<string, any> {
  return JSON.parse(ficheroDelModulo(rel));
}

beforeEach(() => {
  comandos.length = 0;
  // El doble imita el contrato del CLIENTE (`ErploraClient`), no el del transporte: `query()` pasa
  // la respuesta por `unwrapPage()`, así que a quien la llama le llega ya el ARRAY. Devolver aquí
  // el sobre `{rows}` en crudo sería un doble infiel — y de hecho lo era: escondía que el
  // componente hacía `.map()` sobre un objeto.
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) =>
      name === 'inventory.products.list'
        ? [{ id: 'p1', name: 'Café solo', sku: 'CAF', price: 220, stock: 10_000_000, unit_code: 'ud', is_active: 1, tax_category_key: 'standard' }]
        : name === 'taxes.categories.list'
          ? [CATEGORIA_FISCAL]
          : [],
    // El selector de categorías fiscales de la ficha se carga por `queryAll` (no por `query`):
    // sin este doble el catálogo llegaba vacío y NINGUNA alta era posible desde inventory#38.
    queryAll: async (name: string) => (name === 'taxes.categories.list' ? [CATEGORIA_FISCAL] : []),
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
  // `taxes` puede no tener permiso o contestar algo que no es una lista. Desde inventory#38 eso NO
  // deja pasar el alta sin categoría (el formulario avisa y bloquea, ver más abajo), pero lo que
  // sigue sin poder pasar es que la página de productos se caiga entera por un desplegable.
  it('si `taxes` no devuelve una lista, la página sigue en pie (no revienta el render)', async () => {
    (globalThis as Record<string, unknown>).erplora = {
      ...(globalThis as Record<string, { erplora: unknown }> & { erplora: object }).erplora,
      // El catálogo se carga por `queryAll` — es ESE el que hay que envenenar. Envenenar `query`
      // no probaba nada: `loadTaxCategories` ni lo llama.
      queryAll: async () => ({ error: 'unknown_query' } as unknown), // taxes no instalado → NO es un array
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
                                  newTaxCategoryKey: string;
                                  createProduct: (ev: Event) => Promise<void> };
    wc.newName = 'Café solo';
    wc.newSku = 'CAF';
    wc.newPrice = '2.20'; // lo que teclea el usuario en un input `step="0.01"` = EUROS
    wc.newTaxCategoryKey = 'standard'; // obligatoria desde inventory#38
    await wc.createProduct(new Event('submit'));

    const alta = comandos.find((c) => c.name === 'inventory.products.create');
    expect(alta, 'no se mandó el alta de producto').toBeTruthy();
    expect(alta!.payload.price, '2,20 € deben guardarse como 220 céntimos').toBe(220);
  });

  it('ENTRADA: los céntimos no se pierden por redondeo (0,05 € → 5)', async () => {
    const el = await montar();
    const wc = el as unknown as { newName: string; newSku: string; newPrice: string;
                                  newTaxCategoryKey: string;
                                  createProduct: (ev: Event) => Promise<void> };
    wc.newName = 'Bolsa';
    wc.newSku = 'BOL';
    wc.newPrice = '0.05';
    wc.newTaxCategoryKey = 'standard';
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
    const altas = await importar([{ name: 'Café solo', sku: 'CAF', price: '2.20', stock: '10', tax_category: 'standard' }]);
    expect(altas, 'no se creó el producto del CSV').toHaveLength(1);
    expect(altas[0].payload.price, '2,20 € deben guardarse como 220 céntimos').toBe(220);
  });

  it('el coste sigue la misma regla («1.05» → 105 céntimos)', async () => {
    const altas = await importar([{ name: 'Bolsa', sku: 'BOL', price: '0.30', cost: '1.05', tax_category: 'standard' }]);
    expect(altas[0].payload.cost).toBe(105);
    expect(altas[0].payload.price).toBe(30);
  });

  it('la CANTIDAD usa su propia escala 10⁶ (no céntimos)', async () => {
    const altas = await importar([{ name: 'Café solo', sku: 'CAF', price: '2.20', stock: '10', tax_category: 'standard' }]);
    expect(altas[0].payload.stock, '10 unidades viajan como 10.000.000 µ').toBe(10_000_000);
  });

  it('un precio vacío o basura entra como 0, no como NaN', async () => {
    const altas = await importar([{ name: 'Sin precio', sku: 'NOP', price: '', tax_category: 'standard' }]);
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
      newUnitCode: string; newTaxCategoryKey: string; units: Record<string, unknown>[];
      createProduct: (ev: Event) => Promise<void>;
    };
    wc.newName = 'Harina';
    wc.newSku = 'HAR';
    wc.newPrice = '1.20';
    wc.newTaxCategoryKey = 'standard';
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
    // `''` = la categoría que el usuario elige en el modal para las filas que no traen ninguna
    // (inventory#38): sin ella el import no crearía NADA.
    await wc.finalizeImport(rows, new Map([['', 'standard']]));
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
               tax_category_key: 'standard', is_active: 1, product_type: 'physical', image: '' }]
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
      newTaxCategoryKey: string;
      selectedCategoryIds: Set<string>; initialCategoryIds: Set<string>;
      createProduct: (ev: Event) => Promise<void>;
    };
    wc.editingId = 'p1';
    wc.newName = 'Café';
    wc.newSku = 'CAF';
    wc.newPrice = '2.20';
    wc.newTaxCategoryKey = 'standard';
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
      newName: string; newSku: string; newPrice: string; newTaxCategoryKey: string; formError: string;
      createProduct: (ev: Event) => Promise<void>;
    };
    wc.newName = 'Café';
    wc.newSku = 'CAF';
    wc.newPrice = '2.20';
    wc.newTaxCategoryKey = 'standard';
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
                                  newTaxCategoryKey: string;
                                  createProduct: (ev: Event) => Promise<void> };
    wc.newName = 'Caña';
    wc.newSku = 'CANA';
    wc.newPrice = '2.20';
    wc.newTaxCategoryKey = 'standard';
    await wc.createProduct(new Event('submit'));
    const alta = comandos.find((c) => c.name === 'inventory.products.create');
    expect(alta!.payload.unit_code, 'el default explícito es ud').toBe('ud');
  });

  it('ALTA: elegir kg envía unit_code "kg"', async () => {
    const el = await montar();
    const wc = el as unknown as { newName: string; newSku: string; newPrice: string;
                                  newUnitCode: string; newTaxCategoryKey: string;
                                  createProduct: (ev: Event) => Promise<void> };
    wc.newName = 'Gambas';
    wc.newSku = 'GAM';
    wc.newPrice = '12.00';
    wc.newTaxCategoryKey = 'standard';
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
               low_stock_threshold: 5_000_000, ean13: null, description: '', tax_category_key: 'standard',
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

// ─────────────────────────────────────────────────────────────────────────────────────────────
// inventory#38 — un producto NO puede existir sin saber cómo tributa.
//
// `tax_category_key` era opcional: se daba de alta un producto que no sabía si era 21 %, 10 % o
// exento y nadie se enteraba hasta que un cajero intentaba cobrarlo y la venta se rechazaba, con el
// cliente delante. El sector entero (Square, Lightspeed, Toast, Odoo) valida el impuesto al GUARDAR
// el artículo, no al venderlo. Los productos que YA existen sin categoría no se migran —asignarles
// una por defecto sería inventarse dato fiscal—: se marcan y se ven.
// ─────────────────────────────────────────────────────────────────────────────────────────────
describe('el contrato exige la categoría fiscal (inventory#38)', () => {
  it('el schema de ALTA la pide como cadena NO vacía', () => {
    const schema = jsonDelModulo('schemas/product_create.json');
    expect(schema.required, 'sin `required` el hueco fiscal sigue abierto').toContain('tax_category_key');
    const prop = schema.properties.tax_category_key;
    expect(prop.type, 'null ya no vale: es no saber cómo tributa').toBe('string');
    expect(prop.minLength, 'la cadena vacía es el mismo agujero con otro nombre').toBe(1);
    expect(prop.default, 'un `default: null` reabriría el hueco al omitir el campo').toBeUndefined();
  });

  it('el ALTA EN BLOQUE tampoco es una puerta trasera', () => {
    // `bulk_create` es la otra puerta de alta (el handler WASM, y la herramienta que usa el
    // asistente para «mete estos 20 platos»). Si ahí siguiera siendo opcional, la regla sería
    // mentira: entrarían por lote justo los productos que no se pueden cobrar.
    const item = jsonDelModulo('schemas/products_bulk_create.json').properties.products.items;
    expect(item.required).toContain('tax_category_key');
    expect(item.properties.tax_category_key.type).toBe('string');
    expect(item.properties.tax_category_key.minLength).toBe(1);
    expect(item.properties.tax_category_key.default).toBeUndefined();
  });

  it('el schema de EDICIÓN no deja VACIARLA', () => {
    const schema = jsonDelModulo('schemas/product_update.json');
    expect(schema.required).toContain('tax_category_key');
    const prop = schema.properties.tax_category_key;
    expect(prop.type).toBe('string');
    expect(prop.minLength).toBe(1);
  });
});

describe('la ficha de producto exige la categoría fiscal (inventory#38)', () => {
  it('ALTA sin categoría: NO se manda el command y se explica por qué', async () => {
    const el = await montar();
    const wc = el as unknown as {
      newName: string; newSku: string; newPrice: string; newTaxCategoryKey: string;
      formError: string; createProduct: (ev: Event) => Promise<void>;
    };
    wc.newName = 'Café solo';
    wc.newSku = 'CAF';
    wc.newPrice = '2.20';
    wc.newTaxCategoryKey = '';
    await wc.createProduct(new Event('submit'));
    expect(comandos.find((c) => c.name === 'inventory.products.create'),
      'un producto que no sabe cómo tributa no se guarda').toBeFalsy();
    expect(wc.formError, 'y el usuario ve POR QUÉ, no un botón muerto').toBe('ui.errTaxCategoryRequired');
  });

  it('ALTA con categoría: la clave elegida viaja en el payload', async () => {
    const el = await montar();
    const wc = el as unknown as {
      newName: string; newSku: string; newPrice: string; newTaxCategoryKey: string;
      createProduct: (ev: Event) => Promise<void>;
    };
    wc.newName = 'Café solo';
    wc.newSku = 'CAF';
    wc.newPrice = '2.20';
    wc.newTaxCategoryKey = 'standard';
    await wc.createProduct(new Event('submit'));
    expect(comandos.find((c) => c.name === 'inventory.products.create')!.payload.tax_category_key)
      .toBe('standard');
  });

  it('EDICIÓN: vaciar la categoría NO guarda (no se puede desconfigurar un producto)', async () => {
    const el = await montar();
    const wc = el as unknown as {
      editingId: string | null; newName: string; newSku: string; newPrice: string;
      newTaxCategoryKey: string; formError: string; createProduct: (ev: Event) => Promise<void>;
    };
    wc.editingId = 'p1';
    wc.newName = 'Café solo';
    wc.newSku = 'CAF';
    wc.newPrice = '2.20';
    wc.newTaxCategoryKey = '';
    await wc.createProduct(new Event('submit'));
    expect(comandos.find((c) => c.name === 'inventory.products.update')).toBeFalsy();
    expect(wc.formError).toBe('ui.errTaxCategoryRequired');
  });

  it('el selector YA NO ofrece «— (por defecto)»: no hay opción de no elegir', async () => {
    const el = await montar();
    expect(el.shadowRoot?.textContent, 'la opción vacía era la puerta trasera del hueco fiscal')
      .not.toContain('ui.taxDefault');
  });

  it('si el hub aún no tiene categorías fiscales, el formulario lo DICE', async () => {
    (globalThis as Record<string, unknown>).erplora = {
      ...(globalThis as { erplora: object }).erplora,
      queryAll: async () => [],
    };
    const el = await montar();
    expect(el.shadowRoot?.textContent, 'sin categorías no se puede dar de alta: hay que decirlo')
      .toContain('ui.taxNoneAvailable');
  });
});

describe('los productos que YA existen sin categoría SE VEN (inventory#38)', () => {
  it('la query los MARCA (`needs_tax_setup`) y el manifest lo declara filtrable', () => {
    const sql = ficheroDelModulo('queries/products_list.sql');
    expect(sql, 'sin proyectarlo no se puede ni pintar ni filtrar').toMatch(/AS needs_tax_setup/);
    const manifest = jsonDelModulo('module.json');
    const list = manifest.queries['inventory.products.list'].list;
    expect(list.filters, 'filtrable para repasarlos de golpe').toHaveProperty('needs_tax_setup');
    expect(list.filters.needs_tax_setup.op).toBe('eq');
  });

  it('NO hay migración que les invente una categoría por defecto', () => {
    const manifest = jsonDelModulo('module.json');
    for (const rel of manifest.migrations.postgres as string[]) {
      const sql = ficheroDelModulo(rel);
      expect(/UPDATE\s+inventory_product\s+SET\s+tax_category_key/i.test(sql),
        `${rel} rellena tax_category_key: eso es inventarse dato fiscal`).toBe(false);
    }
  });

  it('un producto sin categoría no es «activo» ni «inactivo»: es «sin configurar», con su motivo', async () => {
    const el = await montar();
    const wc = el as unknown as {
      productStatus: (row: Record<string, unknown>) => { id: string; label: string; reason: string };
    };
    const sinConfigurar = wc.productStatus({ is_active: 1, tax_category_key: null });
    expect(sinConfigurar.id).toBe('unconfigured');
    expect(sinConfigurar.label).toBe('ui.statusUnconfigured');
    expect(sinConfigurar.reason, 'el motivo se dice, no se adivina').toBe('ui.statusUnconfiguredReason');
    // La cadena vacía es el mismo agujero que el NULL.
    expect(wc.productStatus({ is_active: 1, tax_category_key: '' }).id).toBe('unconfigured');
    // Con categoría, los dos estados de siempre.
    expect(wc.productStatus({ is_active: 1, tax_category_key: 'standard' }).id).toBe('active');
    expect(wc.productStatus({ is_active: 0, tax_category_key: 'standard' }).id).toBe('inactive');
  });

  it('la FICHA de detalle tampoco dice «Activo: Sí» a un producto sin categoría', async () => {
    const el = await montar();
    const wc = el as unknown as {
      detail: Record<string, unknown> | null; updateComplete: Promise<unknown>; shadowRoot: ShadowRoot;
    };
    wc.detail = { id: 'p1', name: 'Café solo', sku: 'CAF', price: 220, stock: 0, is_active: 1, tax_category_key: null };
    await wc.updateComplete;
    const texto = wc.shadowRoot.textContent ?? '';
    expect(texto).toContain('ui.statusUnconfigured');
    expect(texto).toContain('ui.statusUnconfiguredReason');
  });

  it('ARREGLARLO: se abre el producto viejo, se elige categoría y ya se guarda', async () => {
    // El bucle completo de la incidencia: el listado los enseña, se abre uno (la propia celda del
    // tercer estado es el atajo), se le pone la categoría que le faltaba y el update sale.
    (globalThis as Record<string, unknown>).erplora = {
      ...(globalThis as { erplora: object }).erplora,
      query: async (name: string) =>
        name === 'inventory.products.get'
          ? [{ id: 'p1', name: 'Café solo', sku: 'CAF', price: 220, cost: 90, stock: 0,
               low_stock_threshold: 5_000_000, ean13: null, description: '',
               tax_category_key: null, is_active: 1, product_type: 'physical', unit_code: 'ud' }]
          : [],
    };
    const el = await montar();
    const wc = el as unknown as {
      onRowAction: (ev: CustomEvent) => Promise<void>;
      newTaxCategoryKey: string; formError: string;
      createProduct: (ev: Event) => Promise<void>; updateComplete: Promise<unknown>;
    };
    await wc.onRowAction(new CustomEvent('rowAction', {
      detail: { actionId: 'edit', row: { id: 'p1', name: 'Café solo', sku: 'CAF', price: 220, tax_category_key: null } },
    }) as CustomEvent);
    await wc.updateComplete;
    expect(wc.newTaxCategoryKey, 'la ficha NO se inventa una categoría al abrirla').toBe('');

    await wc.createProduct(new Event('submit'));
    expect(comandos.find((c) => c.name === 'inventory.products.update'),
      'guardar sin elegir categoría seguiría dejándolo sin configurar').toBeFalsy();

    wc.newTaxCategoryKey = 'standard';
    await wc.createProduct(new Event('submit'));
    expect(comandos.find((c) => c.name === 'inventory.products.update')!.payload.tax_category_key)
      .toBe('standard');
  });

  it('la columna de estado ofrece los TRES valores en su filtro', async () => {
    const el = await montar();
    const cols = (el as unknown as { columns: { key: string; options?: { value: string }[] }[] }).columns;
    const estado = cols.find((c) => c.key === 'is_active')!;
    expect(estado.options?.map((o) => o.value)).toEqual(['1', '0', 'unconfigured']);
  });

  it('filtrar por «sin configurar» va al SERVIDOR por needs_tax_setup, no al is_active', async () => {
    const el = await montar();
    const wc = el as unknown as {
      applyStatusFilter: (value: unknown) => void;
      ctrl: { state: { filters: Record<string, unknown> } };
    };
    wc.applyStatusFilter('unconfigured');
    expect(wc.ctrl.state.filters).toEqual({ needs_tax_setup: '1' });
    // Los tres valores son EXCLUYENTES: elegir otro limpia el anterior (si no, «inactivo» seguiría
    // arrastrando el needs_tax_setup y la lista mentiría).
    wc.applyStatusFilter('0');
    expect(wc.ctrl.state.filters).toEqual({ is_active: '0' });
    wc.applyStatusFilter('');
    expect(wc.ctrl.state.filters).toEqual({});
  });
});

describe('import CSV: ninguna fila entra sin saber cómo tributa (inventory#38)', () => {
  it('una fila cuya categoría no se resuelve se cuenta como FALLIDA con su motivo', async () => {
    const el = await montar();
    const wc = el as unknown as {
      finalizeImport: (rows: Record<string, string>[], map: Map<string, string>) => Promise<void>;
      importReport: { created: number; failed: { line: number; reason: string }[] } | null;
    };
    await wc.finalizeImport([{ name: 'Café', sku: 'CAF', price: '2.20' }], new Map());
    expect(comandos.find((c) => c.name === 'inventory.products.create'),
      'nunca se manda un alta que el schema va a rechazar').toBeFalsy();
    expect(wc.importReport!.created).toBe(0);
    expect(wc.importReport!.failed[0].reason).toBe('ui.importErrTaxCategory');
  });

  it('un CSV SIN columna fiscal pregunta UNA categoría para todas sus filas', async () => {
    const el = await montar();
    const wc = el as unknown as {
      onCsvImport: (ev: CustomEvent) => Promise<void>;
      confirmImportResolution: () => Promise<void>;
      importOpen: boolean; importUnresolved: string[];
      importChoice: Record<string, { mode: string; key: string; newKey: string; newName: string }>;
    };
    await wc.onCsvImport(new CustomEvent('csvImport', {
      detail: { rows: [{ name: 'Café', sku: 'CAF', price: '2.20' }, { name: 'Té', sku: 'TE', price: '1.80' }] },
    }));
    expect(wc.importOpen, 'no se importa a ciegas: se pregunta').toBe(true);
    expect(wc.importUnresolved, 'la entrada «filas sin categoría» es la cadena vacía').toContain('');
    expect(comandos.filter((c) => c.name === 'inventory.products.create'),
      'nada se crea hasta que el usuario decide').toHaveLength(0);

    wc.importChoice = { '': { mode: 'pick', key: 'standard', newKey: '', newName: '' } };
    await wc.confirmImportResolution();
    const altas = comandos.filter((c) => c.name === 'inventory.products.create');
    expect(altas).toHaveLength(2);
    expect(altas.every((a) => a.payload.tax_category_key === 'standard')).toBe(true);
  });

  it('un CSV cuya columna fiscal SÍ resuelve no pregunta nada', async () => {
    const el = await montar();
    const wc = el as unknown as { onCsvImport: (ev: CustomEvent) => Promise<void>; importOpen: boolean };
    await wc.onCsvImport(new CustomEvent('csvImport', {
      detail: { rows: [{ name: 'Café', sku: 'CAF', price: '2.20', tax_category: 'standard' }] },
    }));
    expect(wc.importOpen).toBe(false);
    expect(comandos.find((c) => c.name === 'inventory.products.create')!.payload.tax_category_key)
      .toBe('standard');
  });
});

describe('hallazgos del QA sectorial (07-16)', () => {
  it('borrar producto NO ejecuta directo: abre confirmación (paridad con categorías)', async () => {
    const el = await montar();
    const wc = el as unknown as {
      onRowAction: (ev: CustomEvent) => Promise<void>;
      deleteTarget: { id: string } | null;
      confirmDelete: () => Promise<void>;
    };
    await wc.onRowAction(new CustomEvent('rowAction', {
      detail: { actionId: 'delete', row: { id: 'p1', name: 'Café solo', sku: 'CAF' } },
    }) as CustomEvent);
    expect(comandos.find((c) => c.name === 'inventory.products.delete'),
      'sin confirmación no se borra (P1 QA beauty #6)').toBeFalsy();
    expect(wc.deleteTarget?.id).toBe('p1');
    await wc.confirmDelete();
    expect(comandos.find((c) => c.name === 'inventory.products.delete')?.payload.product_id).toBe('p1');
    expect(wc.deleteTarget).toBeNull();
  });
});

describe('imprimir el código de barras avisa cuando NO sale (inventory#44)', () => {
  // El botón llamaba a la puerta con `void`: el resultado (`PrintResult{via, error}`) se tiraba, así
  // que un documento rechazado, una etiqueta en blanco o «ninguna impresora con el rol Etiqueta»
  // se veían igual que un tique impreso — nada en pantalla y nada en papel.
  const detalle = { id: 'p1', name: 'Café solo', sku: 'CAF', price: 220, stock: 10_000_000, is_active: 1 };

  async function abrirDetalle() {
    const el = await montar();
    const wc = el as unknown as {
      detail: Record<string, unknown> | null;
      printBarcode: (p: Record<string, unknown>) => Promise<void>;
      updateComplete: Promise<unknown>;
      shadowRoot: ShadowRoot;
    };
    wc.detail = { ...detalle };
    await wc.updateComplete;
    return wc;
  }

  it('un fallo de la puerta se PINTA junto al botón, no se traga', async () => {
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.print = async () => ({ via: 'none', role: 'label', error: 'el runtime rechazó el encolado' });
    const wc = await abrirDetalle();

    await wc.printBarcode(wc.detail!);
    await wc.updateComplete;

    const aviso = wc.shadowRoot.querySelector('ok-inline-feedback[tone="danger"]');
    expect(aviso, 'el usuario tiene que ver que la etiqueta no salió').not.toBeNull();
    expect(aviso!.textContent, 'mensaje traducido del módulo').toContain('ui.errPrintBarcode');
    expect(aviso!.textContent, 'con el motivo técnico de la puerta para poder actuar')
      .toContain('encolado');
  });

  it('sin impresora del rol Etiqueta en la app instalada lo dice (falso éxito `via:browser`)', async () => {
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.print = async () => ({ via: 'browser', role: 'label' });
    // La app instalada no tiene diálogo de impresión: el respaldo del navegador resuelve bien y NO
    // imprime nada. Misma sonda que el shell (`window.__TAURI__.core.invoke`).
    (globalThis as Record<string, unknown>).__TAURI__ = { core: { invoke: async () => null } };
    const wc = await abrirDetalle();

    await wc.printBarcode(wc.detail!);
    await wc.updateComplete;

    const aviso = wc.shadowRoot.querySelector('ok-inline-feedback[tone="danger"]');
    expect(aviso!.textContent).toContain('ui.errPrintBarcodeNoPrinter');
    delete (globalThis as Record<string, unknown>).__TAURI__;
  });

  it('un envío correcto no deja aviso, y reintentar limpia el anterior', async () => {
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.print = async () => ({ via: 'none', role: 'label', error: 'boom' });
    const wc = await abrirDetalle();
    await wc.printBarcode(wc.detail!);
    await wc.updateComplete;
    expect(wc.shadowRoot.querySelector('ok-inline-feedback[tone="danger"]')).not.toBeNull();

    sdk.print = async () => ({ via: 'bridge', role: 'label', printerId: 'network:10.0.0.5:9100' });
    await wc.printBarcode(wc.detail!);
    await wc.updateComplete;

    expect(wc.shadowRoot.querySelector('ok-inline-feedback[tone="danger"]'),
      'salió por el Bridge: no hay nada que avisar').toBeNull();
  });

  it('manda el documento ESTRUCTURADO que la impresora entiende (no solo el HTML)', async () => {
    const peticiones: Record<string, unknown>[] = [];
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.print = async (req: Record<string, unknown>) => {
      peticiones.push(req);
      return { via: 'bridge', role: 'label' };
    };
    const wc = await abrirDetalle();

    await wc.printBarcode(wc.detail!);

    const data = peticiones[0].data as Record<string, unknown>;
    expect(peticiones[0].documentType, 'el vocabulario ESC/POS no tiene `label`').toBe('barcode_label');
    expect(data.product_name).toBe('Café solo');
    expect(data.barcode).toBe('CAF');
    // El precio persistido son CÉNTIMOS (ADR-0007) y la etiqueta lo imprime en crudo: 220 en la
    // etiqueta sería un café de 220 €.
    expect(data.price, '220 céntimos = 2,20 € en la etiqueta').toBe(2.2);
  });
});

describe('el código de barras del detalle es ESCANEABLE en tema oscuro (inventory#45)', () => {
  // El contenedor definía `border` pero no `background`, así que heredaba el fondo oscuro del
  // `ion-modal`: barras negras sobre negro → ningún escáner lee eso. Y el arreglo NO puede ir en la
  // clase `.barcode` del shadow: Ionic reparenta el modal a <body> y esas reglas no llegan.
  async function placa() {
    const el = await montar();
    const wc = el as unknown as {
      detail: Record<string, unknown> | null;
      updateComplete: Promise<unknown>;
      shadowRoot: ShadowRoot;
    };
    wc.detail = { id: 'p1', name: 'Café solo', sku: 'CAF', price: 220, stock: 0, is_active: 1 };
    await wc.updateComplete;
    const svg = wc.shadowRoot.querySelector('svg.bc') as SVGElement;
    expect(svg, 'el detalle pinta el código de barras').not.toBeNull();
    return { wc, svg, contenedor: svg.closest('div') as HTMLElement };
  }

  it('la placa lleva fondo BLANCO inline (no heredado del tema)', async () => {
    const { contenedor } = await placa();
    const estilo = contenedor.getAttribute('style') ?? '';
    expect(estilo, 'fondo blanco explícito, en los dos temas').toMatch(/background\s*:\s*(#fff{1,2}(f{3})?|white)/i);
    expect(estilo, 'un token del tema volvería a oscurecerse en dark').not.toMatch(/background[^;]*var\(/i);
  });

  it('las barras son NEGRAS fijas, no `currentColor`', async () => {
    const { svg } = await placa();
    expect(svg.getAttribute('fill'), 'un código de barras no se tematiza').toBe('#000');
  });

  it('el SKU de debajo también se pinta oscuro (heredaba el color claro del tema)', async () => {
    const { contenedor } = await placa();
    const pie = Array.from(contenedor.querySelectorAll('div')).find((d) => d.textContent?.trim() === 'CAF');
    expect(pie, 'el SKU se lee bajo las barras').toBeTruthy();
    expect(pie!.getAttribute('style') ?? '', 'color oscuro explícito sobre la placa blanca')
      .toMatch(/color\s*:\s*(#[0-9a-f]{3,6}|black)/i);
  });

  it('el SVG no se sale de la placa en pantallas estrechas (la regla `.barcode .bc` no llega)', async () => {
    const { svg } = await placa();
    expect(svg.getAttribute('style') ?? '', 'max-width inline: el shadow CSS no aplica tras el reparent')
      .toMatch(/max-width\s*:\s*100%/i);
  });
});

describe('controlar stock es una casilla POR ARTÍCULO (inventory#48)', () => {
  // Decisión de mercado (sales#25): Square, Odoo, Shopify, WooCommerce y Business Central llevan
  // el «track stock» en la ficha del artículo; el ajuste del hub es solo el valor por defecto.
  // Contrato con el servidor: `track_stock` es tri-estado (ADR-0210) — 1/0 explícito, y
  // null/ausente = «sigue el ajuste del hub».
  it('el contrato acepta 1/0/null en alta y edición (edición: ausente = conserva)', () => {
    const alta = jsonDelModulo('schemas/product_create.json');
    expect(alta.properties.track_stock.enum).toEqual([0, 1, null]);
    expect(alta.required, 'opcional en el alta: ausente = hereda el hub').not.toContain('track_stock');
    const edicion = jsonDelModulo('schemas/product_update.json');
    expect(edicion.properties.track_stock.enum).toEqual([0, 1, null]);
    expect(edicion.required, 'opcional en la edición: un caller viejo no lo pisa').not.toContain('track_stock');
    expect(ficheroDelModulo('commands/product_update.sql')).toMatch(/track_stock\s*=\s*COALESCE\(/);
  });

  it('ALTA: sin tocar la casilla se envía null (el artículo SIGUE al hub, no congela el valor de hoy)', async () => {
    const el = await montar();
    const wc = el as unknown as { newName: string; newSku: string; newPrice: string; newTaxCategoryKey: string;
                                  createProduct: (ev: Event) => Promise<void> };
    wc.newName = 'Café';
    wc.newSku = 'CAF';
    wc.newPrice = '2.20';
    wc.newTaxCategoryKey = 'standard';
    await wc.createProduct(new Event('submit'));
    const alta = comandos.find((c) => c.name === 'inventory.products.create')!;
    expect('track_stock' in alta.payload, 'la clave viaja (contrato explícito), con null').toBe(true);
    expect(alta.payload.track_stock).toBeNull();
  });

  it('ALTA: desmarcar la casilla envía 0 (solo catálogo, sin movimientos)', async () => {
    const el = await montar();
    const wc = el as unknown as { newName: string; newSku: string; newPrice: string; newTaxCategoryKey: string;
                                  setTrackStock: (v: boolean) => void;
                                  createProduct: (ev: Event) => Promise<void> };
    wc.newName = 'Menú del día';
    wc.newSku = 'MENU';
    wc.newPrice = '12.00';
    wc.newTaxCategoryKey = 'standard';
    wc.setTrackStock(false);
    await wc.createProduct(new Event('submit'));
    expect(comandos.find((c) => c.name === 'inventory.products.create')!.payload.track_stock).toBe(0);
  });

  it('la casilla se pinta con el valor EFECTIVO: null + hub apagado → desmarcada; marcarla envía 1', async () => {
    (globalThis as Record<string, unknown>).erplora = {
      ...(globalThis as { erplora: object }).erplora,
      query: async (name: string) =>
        name === 'inventory.settings.get'
          ? [{ allow_sell_without_stock: 0, low_stock_threshold: 10, track_stock: 0 }]
          : name === 'inventory.products.get'
            ? [{ id: 'p1', name: 'Café', sku: 'CAF', price: 220, cost: 0, stock: 0, low_stock_threshold: 5_000_000,
                 ean13: null, description: '', tax_category_key: 'standard', is_active: 1,
                 product_type: 'physical', track_stock: null }]
            : [],
    };
    const el = await montar();
    const wc = el as unknown as {
      trackStockEffective: () => boolean; hubTracksStock: boolean;
      onRowAction: (ev: CustomEvent) => Promise<void>; setTrackStock: (v: boolean) => void;
      createProduct: (ev: Event) => Promise<void>; updateComplete: Promise<unknown>;
    };
    await wc.updateComplete;
    expect(wc.hubTracksStock, 'el ajuste del hub se lee (best-effort)').toBe(false);
    await wc.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'edit', row: { id: 'p1' } } }));
    await wc.updateComplete;
    expect(wc.trackStockEffective(), 'null hereda el hub → apagado').toBe(false);
    // Guardar sin tocarla: sigue null (el artículo sigue al hub).
    await wc.createProduct(new Event('submit'));
    expect(comandos.find((c) => c.name === 'inventory.products.update')!.payload.track_stock).toBeNull();
    // Marcarla: fija 1 aunque el hub esté apagado (el artículo manda). Guardar cerró la ficha, se reabre.
    comandos.length = 0;
    await wc.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'edit', row: { id: 'p1' } } }));
    await wc.updateComplete;
    wc.setTrackStock(true);
    expect(wc.trackStockEffective()).toBe(true);
    await wc.createProduct(new Event('submit'));
    expect(comandos.find((c) => c.name === 'inventory.products.update')!.payload.track_stock).toBe(1);
  });

  it('EDICIÓN: un artículo con 0 guardado se carga desmarcado aunque el hub controle', async () => {
    (globalThis as Record<string, unknown>).erplora = {
      ...(globalThis as { erplora: object }).erplora,
      query: async (name: string) =>
        name === 'inventory.settings.get'
          ? [{ allow_sell_without_stock: 0, low_stock_threshold: 10, track_stock: 1 }]
          : name === 'inventory.products.get'
            ? [{ id: 'p1', name: 'Menú', sku: 'MENU', price: 1200, cost: 0, stock: 0, low_stock_threshold: 5_000_000,
                 ean13: null, description: '', tax_category_key: 'standard', is_active: 1,
                 product_type: 'physical', track_stock: 0 }]
            : [],
    };
    const el = await montar();
    const wc = el as unknown as {
      trackStockEffective: () => boolean;
      onRowAction: (ev: CustomEvent) => Promise<void>; updateComplete: Promise<unknown>;
    };
    await wc.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'edit', row: { id: 'p1' } } }));
    await wc.updateComplete;
    expect(wc.trackStockEffective()).toBe(false);
  });

  it('cancelar la edición vuelve al default (null): el siguiente alta no hereda la casilla', async () => {
    const el = await montar();
    const wc = el as unknown as { newTrackStock: number | null; setTrackStock: (v: boolean) => void; cancelEdit: () => void };
    wc.setTrackStock(false);
    expect(wc.newTrackStock).toBe(0);
    wc.cancelEdit();
    expect(wc.newTrackStock).toBeNull();
  });

  it('la ficha tiene su etiqueta traducida (inglés fuente + es)', () => {
    const en = jsonDelModulo('locales/en.json');
    const es = jsonDelModulo('locales/es.json');
    expect(en.ui.fieldTrackStock).toBeTruthy();
    expect(es.ui.fieldTrackStock).toBeTruthy();
    expect(en.ui.trackStockInherit).toBeTruthy();
    expect(es.ui.trackStockInherit).toBeTruthy();
  });
});
