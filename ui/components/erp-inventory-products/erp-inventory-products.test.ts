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
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
  // Desde inventory#13 soltar el fichero abre la VISTA PREVIA y no crea nada: el import empieza
  // cuando el usuario confirma el mapeo. Estos contratos (euros↔céntimos, escala 10⁶) son los
  // mismos; lo que cambia es que hay un paso más antes, y estas pruebas lo recorren entero.
  async function importar(rows: Record<string, string>[]) {
    const el = await montar();
    const wc = el as unknown as {
      onCsvImport: (ev: CustomEvent) => Promise<void>;
      confirmPreview: () => Promise<void>;
    };
    await wc.onCsvImport(new CustomEvent('csv-import', { detail: { rows } }));
    await wc.confirmPreview();
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

  // inventory#101: the minor unit is the hub currency's. A fixed `× 100` stored a 480 ¥ cost as
  // 48000 ¥ and 1.234 KWD as 123 fils.
  it.each([
    { currency: 'JPY', decimals: 0, typed: '480', minor: 480 },
    { currency: 'KWD', decimals: 3, typed: '1.234', minor: 1234 },
  ])('receive cost uses the hub currency scale ($currency)', async ({ decimals, typed, minor }) => {
    const el = await montar();
    (globalThis as { erplora: Record<string, unknown> }).erplora.currencyDecimals = decimals;
    const wc = el as unknown as {
      receiveTarget: Record<string, unknown> | null; receiveQty: string; receiveCost: string;
      submitReceive: () => Promise<void>;
    };
    wc.receiveTarget = { id: 'p1', name: 'Té', sku: 'TEA', stock: 10_000_000, unit_code: 'ud' };
    wc.receiveQty = '1';
    wc.receiveCost = typed;
    await wc.submitReceive();
    const rec = comandos.find((c) => c.name === 'inventory.stock.receive');
    expect(rec, 'the receipt was not sent').toBeTruthy();
    expect((rec!.payload.items as Record<string, unknown>[])[0].unit_cost).toBe(minor);
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

  // hub#1737 — the REAL contract of a duplicate SKU. The runtime never lets the driver's text reach
  // a module (hub#1074): a unique-index violation arrives as code `db` with the fixed redacted line,
  // and the SDK surfaces that same pair. The double this test used to have threw SQLite's own
  // «UNIQUE constraint failed» text, which no hub has sent since hub#1074 — so it proved a regex
  // that never matches in production, and a re-imported product was reported as a FAILED row with
  // «could not be completed» instead of an omitted one.
  const REDACTED = 'the request could not be completed — the hub recorded the details';
  function dbRefusal(): Error {
    return Object.assign(new Error(REDACTED), { code: 'db' });
  }
  /** Hub whose catalogue already holds `existing` and whose unique index refuses it again. */
  function hubWithCatalogue(existing: string[]): void {
    const base = (globalThis as { erplora: Record<string, unknown> }).erplora;
    (globalThis as Record<string, unknown>).erplora = {
      ...base,
      // The `sku` filter is a LIKE: it may bring near-misses, the caller must match exactly.
      queryAll: async (name: string, params: { filters?: Record<string, unknown> } = {}) => {
        if (name !== 'inventory.products.list') return (base.queryAll as (n: string) => unknown)(name);
        const needle = String(params.filters?.sku ?? '');
        return existing
          .filter((sku) => sku.includes(needle))
          .map((sku, i) => ({ id: `p-${i}`, name: sku, sku, price: 100, stock: 0, unit_code: 'ud', is_active: 1 }));
      },
      command: async (name: string, payload: Record<string, unknown>) => {
        comandos.push({ name, payload });
        if (name === 'inventory.products.create' && existing.includes(String(payload.sku))) throw dbRefusal();
        return {};
      },
    };
  }

  it('re-importing a product that already exists counts it as SKIPPED, not failed (hub#1737)', async () => {
    hubWithCatalogue(['MAHOU']);
    const wc = await importarConResultado([
      { name: 'Nuevo', sku: 'NUEVO', price: '1.00' },
      { name: 'Cerveza Mahou', sku: 'MAHOU', price: '2.00' },
    ]);
    const rep = wc.importReport!;
    expect(rep.total).toBe(2);
    expect(rep.created).toBe(1);
    expect(rep.skipped, 'the product that was already there is counted as omitted').toBe(1);
    expect(rep.failed).toHaveLength(0);
    expect(rep.created + rep.skipped + rep.failed.length, 'the counters add up to the rows of the file').toBe(rep.total);
  });

  it('a short numeric SKU is still found among the many that CONTAIN it: skipped, not failed (hub#1737)', async () => {
    // Numeric SKUs are common (1, 2 … 300). `f_sku` is a LIKE, so «1» also brings 10–19, 21, 100–199…
    // and the list engine answers one PAGE of them, sorted by name. The double pages like the
    // runtime does, so a lookup that reads a single page misses the product that is really there.
    const skus = Array.from({ length: 300 }, (_, i) => String(i + 1));
    const catalogue = skus.map((sku) => ({
      id: `p-${sku}`,
      name: sku === '1' ? 'Zumo de naranja' : `Artículo ${sku.padStart(3, '0')}`,
      sku, price: 100, stock: 0, unit_code: 'ud', is_active: 1,
    }));
    const matching = (needle: string) =>
      catalogue.filter((p) => p.sku.includes(needle)).sort((a, b) => a.name.localeCompare(b.name));
    const base = (globalThis as { erplora: Record<string, unknown> }).erplora;
    (globalThis as Record<string, unknown>).erplora = {
      ...base,
      query: async (name: string, params: Record<string, unknown> = {}) => {
        if (name !== 'inventory.products.list') return (base.query as (n: string) => unknown)(name);
        const offset = Number(params.offset ?? 0);
        return matching(String(params.f_sku ?? '')).slice(offset, offset + Number(params.limit ?? 50));
      },
      queryAll: async (name: string, params: { filters?: Record<string, unknown> } = {}) => {
        if (name !== 'inventory.products.list') return (base.queryAll as (n: string) => unknown)(name);
        return matching(String(params.filters?.sku ?? ''));
      },
      command: async (name: string, payload: Record<string, unknown>) => {
        comandos.push({ name, payload });
        if (name === 'inventory.products.create' && skus.includes(String(payload.sku))) throw dbRefusal();
        return {};
      },
    };
    const wc = await importarConResultado([{ name: 'Zumo de naranja', sku: '1', price: '2.00' }]);
    expect(wc.importReport!.skipped, 'SKU «1» is in the catalogue, past the first page of the LIKE').toBe(1);
    expect(wc.importReport!.failed).toHaveLength(0);
  });

  it('a `db` refusal for a SKU that is NOT in the catalogue stays a FAILED row with its line (hub#1737)', async () => {
    hubWithCatalogue(['MAHOU-LATA']); // a near-miss the LIKE filter returns: it is not this SKU
    (globalThis as { erplora: Record<string, unknown> }).erplora.command = async (
      name: string,
      payload: Record<string, unknown>,
    ) => {
      comandos.push({ name, payload });
      throw dbRefusal();
    };
    const wc = await importarConResultado([{ name: 'Cerveza Mahou', sku: 'MAHOU', price: '2.00' }]);
    const rep = wc.importReport!;
    expect(rep.skipped, 'an unrelated database failure is never passed off as «already existed»').toBe(0);
    expect(rep.failed).toHaveLength(1);
    expect(rep.failed[0].line).toBe(2);
    expect(rep.total).toBe(1);
  });

  it('confirming the import twice runs it ONCE: the report is never overwritten with zeros (hub#1737)', async () => {
    const el = await montar();
    const wc = el as unknown as {
      confirmImportResolution: () => Promise<void>;
      importRows: Record<string, string>[];
      importUnresolved: string[];
      importChoice: Record<string, { mode: string; key: string; newKey: string; newName: string }>;
      importReport: { total: number; created: number; skipped: number; failed: unknown[] } | null;
    };
    wc.importRows = [{ name: 'Cerveza Mahou', sku: 'MAHOU', price: '2.00' }];
    wc.importUnresolved = [''];
    wc.importChoice = { '': { mode: 'pick', key: 'standard', newKey: '', newName: '' } };
    // A double tap on «Import» while the modal is still animating out.
    await Promise.all([wc.confirmImportResolution(), wc.confirmImportResolution()]);
    expect(comandos.filter((c) => c.name === 'inventory.products.create')).toHaveLength(1);
    expect(wc.importReport, 'the report of the run that happened').toMatchObject({ total: 1, created: 1, skipped: 0 });
  });

  it('an import with no rows to process never paints a report of zeros (hub#1737)', async () => {
    const wc = await importarConResultado([]);
    expect(wc.importReport, 'nothing ran, so there is nothing to report').toBeNull();
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

describe('importador CSV: vista previa con mapeo ANTES de importar (inventory#13)', () => {
  // El paso que faltaba, y que hacen todos: Odoo mapea columnas y ofrece «Test import»;
  // WooCommerce y Lightspeed no dejan importar hasta que las columnas obligatorias están mapeadas;
  // Shopify enseña un resumen antes de confirmar. Sin él, un listado de precios español
  // («Nombre;Código;Precio») entraba con CERO filas y el usuario solo veía el informe de errores.
  async function soltarFichero(rows: Record<string, string>[]) {
    const el = await montar();
    const wc = el as unknown as {
      onCsvImport: (ev: CustomEvent) => Promise<void>;
      previewOpen: boolean;
      previewRows: Record<string, string>[];
      previewMapping: Record<string, string>;
      previewSummary: { ready: number; failed: { line: number; reason: string }[] };
      confirmPreview: () => Promise<void>;
      cancelPreview: () => void;
      updateComplete: Promise<unknown>;
    };
    await wc.onCsvImport(new CustomEvent('csvImport', { detail: { rows } }) as CustomEvent);
    return wc;
  }

  it('soltar el CSV abre la vista previa y NO crea nada todavía', async () => {
    const wc = await soltarFichero([{ name: 'Café', sku: 'CAF', price: '2.20' }]);
    expect(wc.previewOpen, 'la vista previa se abre').toBe(true);
    expect(comandos.filter((c) => c.name === 'inventory.products.create'),
      'nada entra sin confirmar').toHaveLength(0);
  });

  it('el mapeo se adivina de las cabeceras, también en español', async () => {
    const wc = await soltarFichero([{ Nombre: 'Café', 'Código': 'CAF', Precio: '2,20', IVA: 'standard' }]);
    expect(wc.previewMapping['Nombre']).toBe('name');
    expect(wc.previewMapping['Código']).toBe('sku');
    expect(wc.previewMapping['Precio']).toBe('price');
    expect(wc.previewMapping['IVA']).toBe('tax');
  });

  it('la vista previa valida TODAS las filas antes de tocar el dispatcher', async () => {
    const wc = await soltarFichero([
      { Nombre: 'Café', 'Código': 'CAF', Precio: '2.20' },
      { Nombre: '', 'Código': '', Precio: '1.00' },
      { Nombre: 'Té', 'Código': 'TE', Precio: 'abc' },
    ]);
    expect(wc.previewSummary.ready, 'una fila lista').toBe(1);
    expect(wc.previewSummary.failed, 'dos con problema, con su línea física').toHaveLength(2);
    expect(wc.previewSummary.failed[0].line).toBe(3);
    expect(comandos, 'un ensayo no escribe').toHaveLength(0);
  });

  it('cancelar la vista previa no deja efecto ninguno', async () => {
    const wc = await soltarFichero([{ name: 'Café', sku: 'CAF', price: '2.20' }]);
    wc.cancelPreview();
    expect(wc.previewOpen).toBe(false);
    expect(wc.previewRows).toHaveLength(0);
    expect(comandos).toHaveLength(0);
  });

  it('al confirmar, el producto se crea con los valores de las columnas MAPEADAS', async () => {
    const wc = await soltarFichero([{ Nombre: 'Café', 'Código': 'CAF', Precio: '2.20', IVA: 'standard' }]);
    await wc.confirmPreview();
    const alta = comandos.find((c) => c.name === 'inventory.products.create');
    expect(alta, 'la cabecera en español ya no impide el alta').toBeTruthy();
    expect(alta!.payload.name).toBe('Café');
    expect(alta!.payload.sku).toBe('CAF');
    expect(alta!.payload.price, 'euros → céntimos, ADR-0007').toBe(220);
  });
});

describe('importador CSV: ficheros que rompen (inventory#13)', () => {
  async function soltar(rows: Record<string, string>[]) {
    const el = await montar();
    const wc = el as unknown as {
      onCsvImport: (ev: CustomEvent) => Promise<void>;
      previewOpen: boolean; previewReady: boolean;
      previewSummary: { ready: number; failed: { line: number; reason: string }[] };
      confirmPreview: () => Promise<void>;
    };
    await wc.onCsvImport(new CustomEvent('csvImport', { detail: { rows } }) as CustomEvent);
    return wc;
  }

  it('un fichero vacío no abre nada ni revienta', async () => {
    const wc = await soltar([]);
    expect(wc.previewOpen).toBe(false);
    expect(comandos).toHaveLength(0);
  });

  it('cabeceras que no dicen nada: se puede seguir a mano, pero no importar a ciegas', async () => {
    const wc = await soltar([{ 'Columna 1': 'Café', 'Columna 2': 'CAF' }]);
    expect(wc.previewOpen, 'la vista previa se abre para poder mapearlas').toBe(true);
    expect(wc.previewReady, 'sin nombre ni SKU mapeados no se importa').toBe(false);
    await wc.confirmPreview();
    expect(comandos, 'confirmar con las obligatorias sin mapear no hace nada').toHaveLength(0);
  });

  it('la coma decimal española es un precio, no un error', async () => {
    // Es EL formato del listado de precios que trae el cliente de aquí, y hasta ahora
    // `Number('2,20')` = NaN tumbaba la fila entera con «precio no válido».
    const wc = await soltar([
      { Nombre: 'Café', 'Código': 'CAF', Precio: '2,20', IVA: 'standard' },
      { Nombre: 'Vino', 'Código': 'VIN', Precio: '1.234,56', IVA: 'standard' },
      { Nombre: 'Ron', 'Código': 'RON', Precio: '1,234.56', IVA: 'standard' },
      { Nombre: 'Roto', 'Código': 'ROT', Precio: 'dos euros', IVA: 'standard' },
    ]);
    expect(wc.previewSummary.failed, 'solo el que no es un número').toHaveLength(1);
    await wc.confirmPreview();
    const altas = comandos.filter((c) => c.name === 'inventory.products.create');
    expect(altas.map((a) => a.payload.price)).toEqual([220, 123456, 123456]);
  });

  it('Unicode: el nombre llega tal cual, tildes, ñ y emoji incluidos', async () => {
    const wc = await soltar([{ Nombre: 'Café con leche ☕ — Niño', 'Código': 'CAF-Ñ', Precio: '2,20', IVA: 'standard' }]);
    await wc.confirmPreview();
    const alta = comandos.find((c) => c.name === 'inventory.products.create');
    expect(alta!.payload.name).toBe('Café con leche ☕ — Niño');
    expect(alta!.payload.sku).toBe('CAF-Ñ');
  });

  it('mil filas: el ensayo las juzga TODAS, no solo las que se ven', async () => {
    const filas = Array.from({ length: 1000 }, (_, i) => ({
      Nombre: `Producto ${i}`, 'Código': i === 500 ? '' : `SKU-${i}`, Precio: '1.00', IVA: 'standard',
    }));
    const wc = await soltar(filas);
    expect(wc.previewSummary.ready).toBe(999);
    expect(wc.previewSummary.failed).toHaveLength(1);
    expect(wc.previewSummary.failed[0].line, 'la fila 501 del fichero = línea física 502').toBe(502);
  });
});

describe('importador CSV: progreso y cancelar (inventory#13)', () => {
  it('durante el alta se sabe por dónde va, y cancelar PARA sin dejarlo en silencio', async () => {
    // WooCommerce enseña barra de progreso; Shopify ni siquiera deja cancelar («product imports
    // cannot be cancelled once started»). Aquí se puede: lo que ya entró está contado en el
    // informe, con la marca de que se paró a medias — nunca un parcial callado.
    const el = await montar();
    const wc = el as unknown as {
      finalizeImport: (rows: Record<string, string>[], map: Map<string, string>) => Promise<void>;
      cancelImport: () => void;
      importProgress: { done: number; total: number } | null;
      importReport: { total: number; created: number; skipped: number; cancelled?: boolean;
        failed: { line: number; sku: string; reason: string }[] } | null;
    };
    const vistos: number[] = [];
    (globalThis as Record<string, unknown>).erplora = {
      ...(globalThis as { erplora: object }).erplora,
      command: async (name: string, payload: Record<string, unknown>) => {
        comandos.push({ name, payload });
        vistos.push(wc.importProgress?.done ?? -1);
        if (payload.sku === 'B') wc.cancelImport(); // el usuario pulsa «Cancelar» a mitad
        return {};
      },
    };
    await wc.finalizeImport(
      [
        { name: 'A', sku: 'A', price: '1.00' },
        { name: 'B', sku: 'B', price: '2.00' },
        { name: 'C', sku: 'C', price: '3.00' },
      ],
      new Map([['', 'standard']]),
    );
    expect(vistos[0], 'el progreso va contando desde la primera fila').toBe(0);
    expect(comandos.filter((c) => c.name === 'inventory.products.create'),
      'la tercera fila ya no se manda').toHaveLength(2);
    const rep = wc.importReport!;
    expect(rep.created).toBe(2);
    expect(rep.cancelled, 'el informe dice que se paró a medias').toBe(true);
    expect(wc.importProgress, 'al terminar ya no hay barra').toBeNull();
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
      confirmPreview: () => Promise<void>;
      confirmImportResolution: () => Promise<void>;
      importOpen: boolean; importUnresolved: string[];
      importChoice: Record<string, { mode: string; key: string; newKey: string; newName: string }>;
    };
    await wc.onCsvImport(new CustomEvent('csvImport', {
      detail: { rows: [{ name: 'Café', sku: 'CAF', price: '2.20' }, { name: 'Té', sku: 'TE', price: '1.80' }] },
    }));
    await wc.confirmPreview(); // la vista previa va primero (inventory#13)
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
    const wc = el as unknown as {
      onCsvImport: (ev: CustomEvent) => Promise<void>;
      confirmPreview: () => Promise<void>; importOpen: boolean;
    };
    await wc.onCsvImport(new CustomEvent('csvImport', {
      detail: { rows: [{ name: 'Café', sku: 'CAF', price: '2.20', tax_category: 'standard' }] },
    }));
    await wc.confirmPreview();
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

describe('el modal de recuento dice POR QUÉ el botón está en gris (inventory#59)', () => {
  // Con `fill="outline"` muerto en modo iOS, este modal enseñaba «Stock actual 7» y debajo medio
  // modal en blanco: dos campos sin caja y un «Aplicar recuento» desactivado sin explicación. Las
  // cajas las devuelve `mode="md"` (ver `ui/lib/ionic-fill-needs-md.test.ts`); lo que falta por
  // decir es qué campo bloquea el botón, que es lo que dejaba al operario mirando la pantalla.
  async function modalDeRecuento() {
    const el = await montar();
    const wc = el as unknown as {
      countTarget: Record<string, unknown> | null; countValue: string; countReason: string;
      countBlockedReason: () => string | null; updateComplete: Promise<unknown>;
      shadowRoot: ShadowRoot;
    };
    wc.countTarget = { id: 'p1', name: 'Café solo', sku: 'CAF', stock: 10_000_000, unit_code: 'ud' };
    await wc.updateComplete;
    return wc;
  }

  it('sin cantidad contada, nombra la CANTIDAD', async () => {
    const wc = await modalDeRecuento();
    expect(wc.countBlockedReason()).toBe('ui.countNeedsQty');
  });

  it('con cantidad pero sin motivo, nombra el MOTIVO (no repite la cantidad)', async () => {
    const wc = await modalDeRecuento();
    wc.countValue = '7';
    await wc.updateComplete;
    expect(wc.countBlockedReason()).toBe('ui.countNeedsReason');
  });

  it('un motivo en blancos no cuenta como motivo', async () => {
    const wc = await modalDeRecuento();
    wc.countValue = '7';
    wc.countReason = '   ';
    await wc.updateComplete;
    expect(wc.countBlockedReason()).toBe('ui.countNeedsReason');
  });

  it('completo: NO hay nota colgando explicando un botón que ya está activo', async () => {
    const wc = await modalDeRecuento();
    wc.countValue = '7';
    wc.countReason = 'recuento semanal';
    await wc.updateComplete;
    expect(wc.countBlockedReason()).toBeNull();
  });

  it('la nota se PINTA en el modal, no solo se calcula', async () => {
    const wc = await modalDeRecuento();
    expect(wc.shadowRoot.textContent, 'el motivo del bloqueo no llega a la pantalla')
      .toContain('ui.countNeedsQty');
  });

  it('las dos cadenas están en los DOS catálogos (inglés fuente + es)', () => {
    const en = jsonDelModulo('locales/en.json');
    const es = jsonDelModulo('locales/es.json');
    for (const k of ['countNeedsQty', 'countNeedsReason']) {
      expect(en.ui[k], `falta ${k} en en.json`).toBeTruthy();
      expect(es.ui[k], `falta ${k} en es.json`).toBeTruthy();
      expect(es.ui[k], `${k} sin traducir`).not.toBe(en.ui[k]);
    }
  });
});

// ── inventory#64 ────────────────────────────────────────────────────────────────────────────────
// El selector de categoría fiscal enseñaba el inglés del seed («Product — reduced (food staples,
// pharmacy)») en un hub en español. No porque faltara traducción: `taxes` ≥ 2.3.8 la sirve POR EL
// CONTRATO (`taxes.categories.list` → `display_name`, ya resuelto al idioma del hub, taxes#38/#40) y
// este módulo no la leía. Se comprueba sobre lo que se PINTA, no sobre el fuente.
describe('el selector de categoría fiscal enseña la etiqueta traducida (inventory#64)', () => {
  /** Lo que `taxes` ≥ 2.3.8 devuelve en un hub español: el seed en inglés + su etiqueta. */
  const CANONICA = {
    id: 't1', key: 'product.reduced',
    name: 'Product — reduced (food staples, pharmacy)',
    display_name: 'Producto — reducido (alimentación, farmacia)',
  };
  /** La que creó el dueño: `taxes` la devuelve con su propio texto, sin traducir. Y así se queda. */
  const DEL_DUENO = { id: 't2', key: 'salon.tinte', name: 'Tintes de la casa', display_name: 'Tintes de la casa' };

  /** Sustituye el catálogo fiscal del doble y anota con qué parámetros se pidió. */
  function conCatalogo(cats: Record<string, unknown>[]) {
    const llamadas: { name: string; params?: Record<string, unknown> }[] = [];
    const sdk = (globalThis as Record<string, any>).erplora;
    sdk.queryAll = async (name: string, params?: Record<string, unknown>) => {
      llamadas.push({ name, params });
      return name === 'taxes.categories.list' ? cats : [];
    };
    return llamadas;
  }

  /** Texto de todas las opciones del formulario (el `<ion-select>` vive en el slot `create`). */
  function opciones(el: HTMLElement): string[] {
    return [...(el.shadowRoot?.querySelectorAll('ion-select-option') ?? [])].map(
      (o) => (o.textContent ?? '').trim(),
    );
  }

  it('canónica: pinta «Producto — reducido…», no «Product — reduced…»', async () => {
    conCatalogo([CANONICA]);
    const el = await montar();
    const texto = opciones(el).join(' | ');
    expect(texto).toContain('Producto — reducido (alimentación, farmacia)');
    expect(texto, 'el inglés del seed no puede llegar a la pantalla').not.toContain('Product — reduced');
  });

  it('la del dueño sale tal cual la escribió (esa no se traduce)', async () => {
    conCatalogo([DEL_DUENO]);
    const el = await montar();
    expect(opciones(el).join(' | ')).toContain('Tintes de la casa');
  });

  it('`taxes` viejo, sin la columna: sigue saliendo `name` — nadie ve una opción muda', async () => {
    conCatalogo([{ id: 't1', key: 'product.reduced', name: 'Product — reduced (food staples, pharmacy)' }]);
    const el = await montar();
    expect(opciones(el).join(' | ')).toContain('Product — reduced (food staples, pharmacy)');
  });

  it('pide el catálogo ordenado por lo que se ENSEÑA, no por el inglés del seed', async () => {
    const llamadas = conCatalogo([CANONICA]);
    await montar();
    const cat = llamadas.find((l) => l.name === 'taxes.categories.list');
    expect(cat, 'el selector carga el catálogo por queryAll').toBeTruthy();
    expect(cat!.params?.sort).toBe('display_name');
  });

  it('el modal del importador CSV usa la MISMA etiqueta que el alta', async () => {
    conCatalogo([CANONICA]);
    const el = await montar();
    const wc = el as unknown as {
      importUnresolved: string[];
      importChoice: Record<string, unknown>;
      importOpen: boolean;
      updateComplete: Promise<unknown>;
    };
    wc.importUnresolved = ['comida'];
    wc.importChoice = { comida: { mode: 'pick', key: '', newKey: '', newName: 'comida' } };
    wc.importOpen = true;
    await wc.updateComplete;
    // Hay varios `ion-modal` en la plantilla: el del importador es el que lleva ESE título.
    const modal = [...(el.shadowRoot?.querySelectorAll('ion-modal') ?? [])].find(
      (m) => m.querySelector('ion-title')?.textContent?.trim() === 'ui.importTaxTitle',
    );
    expect(modal, 'el modal del importador está en la plantilla').toBeTruthy();
    const texto = [...(modal?.querySelectorAll('ion-select-option') ?? [])]
      .map((o) => (o.textContent ?? '').trim()).join(' | ');
    expect(texto).toContain('Producto — reducido (alimentación, farmacia)');
    expect(texto).not.toContain('Product — reduced');
  });
});

// ── pm#155 (outfitkit#67, second half) ────────────────────────────────────────────────────────
//
// At 1440 px the «Actions» column fell off the screen with nothing hinting the table went on to
// the right, so the only door into a product was a button nobody could see. OutfitKit 0.1.44
// pins that column, but the other half of the fix is opt-in: `rowClickable` turns the whole row
// into a door — the first thing a user tries. The list has to ask for it, and wire `rowClick`
// to the same detail modal the «detail» action opens.
describe('clicking the row opens the product (pm#155)', () => {
  const PRODUCTO = { id: 'p1', name: 'Café solo', sku: 'CAF', price: 220, stock: 10, unit_code: 'ud', is_active: 1 };

  it('the table declares `rowClickable` → the whole row is a door, not just the action button', async () => {
    const el = await montar();
    const table = el.shadowRoot?.querySelector('ok-data-table') as (HTMLElement & { rowClickable: boolean }) | null;
    expect(
      table?.rowClickable,
      'without `rowClickable` the row is dead: if the actions column is off-screen there is no way in',
    ).toBe(true);
  });

  it('`rowClick` opens the detail modal of the clicked product, same as the «detail» action', async () => {
    const el = await montar();
    const table = el.shadowRoot?.querySelector('ok-data-table') as HTMLElement | null;
    table!.dispatchEvent(new CustomEvent('rowClick', { detail: { row: PRODUCTO } }));
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    const wc = el as unknown as { detail: unknown };
    expect(wc.detail, 'the row was clicked and the detail modal did not take the product').toEqual(PRODUCTO);
  });
});

// ── inventory#72 · the list can be opened ALREADY filtered ────────────────────────────────────
//
// The POS shows the manager an aggregated warning — «N articles cannot be sold: they are missing
// their tax category» — and a «Review the catalogue» link (ERPlora/sales#149). That link used to
// land on the full catalogue, so the manager arrived in front of 280 rows having to remember to
// open the status dropdown and pick «not configured». The count was on the previous screen; the
// screen it led to did not know it.
//
// Odoo and Shopify link their warnings to the ALREADY-NARROWED view, never to the whole list, so
// that is what `?status=` does here. Two halves, and the second one is not decoration: the screen
// has to SAY it is filtered. `ok-data-table` keeps no filter state in `serverSide` mode (its column
// controls read `clientFilters`, which server-side tables never write — ERPlora/outfitkit#…), so a
// silently narrowed list would look exactly like a catalogue with 12 articles in it.
describe('la lista se puede abrir ya filtrada por estado (inventory#72)', () => {
  /** `filters` of every `queryPage` the list controller issued, oldest first. */
  const paginas: Record<string, unknown>[] = [];

  function conUrl(search: string): void {
    paginas.length = 0;
    window.history.replaceState(null, '', `/m/inventory/products${search}`);
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.queryPage = async (_name: string, params: { filters?: Record<string, unknown> }) => {
      paginas.push({ ...(params?.filters ?? {}) });
      return { rows: [], total: 0, limit: 50, offset: 0 };
    };
  }

  it('`?status=unconfigured` pide al servidor `needs_tax_setup=1` en la PRIMERA carga', async () => {
    conUrl('?status=unconfigured');
    await montar();
    expect(paginas.length, 'la lista se ha cargado al menos una vez').toBeGreaterThan(0);
    expect(
      paginas[0].needs_tax_setup,
      'la primera petición ya llega filtrada: si el filtro se aplicase después, el encargado vería ' +
        'las 280 filas parpadear antes de acotarse',
    ).toBe('1');
  });

  it('CONTROL: sin query string la lista se pide SIN `needs_tax_setup` (el control caza el positivo)', async () => {
    conUrl('');
    await montar();
    expect(paginas.length).toBeGreaterThan(0);
    expect(paginas[0].needs_tax_setup, 'sin parámetro no se filtra nada').toBeUndefined();
    expect(paginas[0].is_active, 'y tampoco se filtra por actividad').toBeUndefined();
  });

  it('un valor desconocido se IGNORA y abre la lista normal — nunca una lista vacía sin explicar', async () => {
    conUrl('?status=azul');
    await montar();
    expect(paginas[0].needs_tax_setup).toBeUndefined();
    expect(paginas[0].is_active).toBeUndefined();
  });

  it('`?status=active` / `?status=inactive` usan la MISMA columna que el desplegable de estado', async () => {
    conUrl('?status=active');
    await montar();
    expect(paginas[0].is_active).toBe('1');
    expect(paginas[0].needs_tax_setup).toBeUndefined();

    conUrl('?status=inactive');
    await montar();
    expect(paginas[0].is_active).toBe('0');
  });

  it('quitar el filtro vuelve a pedir la lista COMPLETA', async () => {
    conUrl('?status=unconfigured');
    const el = await montar();
    (el as unknown as { applyStatusFilter: (v: unknown) => void }).applyStatusFilter('');
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect(paginas.length, 'quitar el filtro recarga').toBeGreaterThan(1);
    expect(paginas[paginas.length - 1].needs_tax_setup, 'y la recarga ya no lleva el filtro').toBeUndefined();
  });
});

// ── inventory#83 (deriva de outfitkit#106/#107) ─────────────────────────────────────────────────
//
// La segunda mitad de inventory#72 era un PARCHE: como `ok-data-table` en modo servidor no tenía
// forma de que el consumidor le dijera qué valor enseñar en un filtro de columna, esta pantalla
// pintaba su propio aviso «Filtrado por X · Ver todos» encima de la tabla. Funcionaba, pero dejaba
// el `<ion-select>` de «Estado» EN BLANCO con la lista acotada, y el parche había que repetirlo en
// cada módulo.
//
// `@erplora/outfitkit` ≥ 0.1.57 trae `filterValues` (por `col.key`, con la MISMA forma que emite
// `filterChange`) y su embudo cuenta los filtros activos en modo servidor. Con eso el control dice
// la verdad por sí solo y el aviso propio sobra.
//
// Dos cosas que este contrato fija y que NO son evidentes:
//
//   1. Lo que se le pasa a la tabla es el estado de UI, no el del servidor. El estado tiene TRES
//      valores en UNA columna de pantalla (`is_active`) que viajan por DOS del servidor
//      (`is_active` + `needs_tax_setup`, inventory#38), así que `ctrl.state.filters` NO se puede
//      enlazar tal cual: enseñaría `needs_tax_setup=1` en un desplegable que no tiene esa opción.
//   2. Se asigna un OBJETO NUEVO en cada cambio. La tabla resiembra su espejo por identidad; mutar
//      el mismo objeto in-place no la reseeda —a propósito, para que mande el usuario— y el select
//      se quedaría con el valor viejo.
describe('el filtro de estado que trae puesto se PINTA en la tabla (inventory#83)', () => {
  function conUrl(search: string): void {
    window.history.replaceState(null, '', `/m/inventory/products${search}`);
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.queryPage = async () => ({ rows: [], total: 0, limit: 50, offset: 0 });
  }

  /** Lo que la tabla recibe hoy en `.filterValues` (undefined = la prop no se está pasando). */
  function valoresDeFiltro(el: HTMLElement): Record<string, unknown> | undefined {
    const tabla = el.shadowRoot?.querySelector('ok-data-table') as
      | (HTMLElement & { filterValues?: Record<string, unknown> })
      | null;
    return tabla?.filterValues;
  }

  it('`?status=unconfigured` deja el desplegable de Estado en «Sin configurar»', async () => {
    conUrl('?status=unconfigured');
    const el = await montar();
    expect(
      valoresDeFiltro(el),
      'la lista viene acotada y el control tiene que decirlo: en blanco parece un catálogo de 12',
    ).toEqual({ is_active: 'unconfigured' });
  });

  it('CONTROL: sin query string no se siembra ningún filtro (el control caza el positivo)', async () => {
    conUrl('');
    const el = await montar();
    expect(valoresDeFiltro(el)).toEqual({});
  });

  it('`?status=active` / `?status=inactive` siembran el valor que ofrece el desplegable, no el del servidor', async () => {
    conUrl('?status=active');
    expect(valoresDeFiltro(await montar())).toEqual({ is_active: '1' });
    conUrl('?status=inactive');
    expect(valoresDeFiltro(await montar())).toEqual({ is_active: '0' });
  });

  it('el valor sembrado es de UI: nunca aparece `needs_tax_setup`, que el desplegable no ofrece', async () => {
    conUrl('?status=unconfigured');
    const el = await montar();
    expect(
      Object.keys(valoresDeFiltro(el) ?? {}),
      'enlazar `ctrl.state.filters` tal cual pintaría una opción inexistente',
    ).not.toContain('needs_tax_setup');
  });

  it('cambiar el filtro a mano lo mantiene pintado, y en un objeto NUEVO', async () => {
    conUrl('');
    const el = await montar();
    const antes = valoresDeFiltro(el);
    (el as unknown as { applyStatusFilter: (v: unknown) => void }).applyStatusFilter('0');
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    const despues = valoresDeFiltro(el);
    expect(despues).toEqual({ is_active: '0' });
    expect(
      despues,
      'la tabla resiembra por IDENTIDAD: mutando el mismo objeto el select se queda con el valor viejo',
    ).not.toBe(antes);
  });

  it('quitar el filtro borra la clave, no la deja puesta en vacío', async () => {
    conUrl('?status=unconfigured');
    const el = await montar();
    (el as unknown as { applyStatusFilter: (v: unknown) => void }).applyStatusFilter('');
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect(valoresDeFiltro(el)).toEqual({});
  });

  it('el filtro de OTRA columna sobrevive a un cambio de estado (la resiembra no lo borra)', async () => {
    // La tabla resiembra su espejo ENTERO desde `filterValues`. Si aquí solo se mandara
    // `is_active`, tocar el estado borraría de la pantalla el filtro de `sku` que el usuario acaba
    // de escribir — y la lista seguiría acotada por él, sin nada que lo diga.
    conUrl('');
    const el = await montar();
    const tabla = el.shadowRoot?.querySelector('ok-data-table') as HTMLElement;
    tabla.dispatchEvent(new CustomEvent('filterChange', { detail: { col: 'sku', value: 'CAF' } }));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect(valoresDeFiltro(el)).toEqual({ sku: 'CAF' });

    tabla.dispatchEvent(new CustomEvent('filterChange', { detail: { col: 'is_active', value: '0' } }));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect(valoresDeFiltro(el)).toEqual({ sku: 'CAF', is_active: '0' });
  });

  it('el aviso propio de inventory#72 se RETIRA: el embudo de la tabla ya lo dice', async () => {
    conUrl('?status=unconfigured');
    const el = await montar();
    expect(
      el.shadowRoot?.querySelector('[data-testid="status-filter-notice"]'),
      'dos avisos del mismo filtro es ruido; el parche por módulo se va con la prop de la librería',
    ).toBeNull();
  });

  it('la `ok-data-table` que se HORNEA declara la prop (una versión vieja la ignoraría en silencio)', async () => {
    // Este módulo hornea su copia de OutfitKit en `dist/`, así que «engancharlo» solo significa algo
    // si el bundle que sale de `erplora build` es ≥ 0.1.57. Se comprueba sobre el elemento REAL y no
    // sobre un número de versión: una tabla sin la prop se come el `.filterValues` sin un solo
    // error de consola, y la pantalla volvería al select en blanco sin que nada se ponga rojo.
    await import('@erplora/outfitkit/ok-data-table');
    const Tabla = customElements.get('ok-data-table') as
      | (CustomElementConstructor & { elementProperties?: Map<string, unknown> })
      | undefined;
    expect(Tabla, 'ok-data-table no se ha registrado').toBeTruthy();
    expect(
      [...(Tabla!.elementProperties?.keys() ?? [])],
      'la OutfitKit horneada es anterior a 0.1.57 (outfitkit#107): sin `filterValues` esto es un no-op',
    ).toContain('filterValues');
  });
});

// inventory#101 — the product's price and cost cross the module in MINOR units of the HUB currency.
// `eurosToCents`/`centsToEuros` hard-code two decimals: in a yen hub a 480 ¥ tea was stored as
// 48000 ¥ and reopened as «4.80»; in a dinar hub 1.234 KWD became 123 fils.
describe('product money uses the hub currency scale (inventory#101)', () => {
  const SCALES = [
    { currency: 'JPY', decimals: 0, typed: '480', minor: 480, step: '1' },
    { currency: 'KWD', decimals: 3, typed: '1.234', minor: 1234, step: '0.001' },
  ];

  function setScale(decimals: number): void {
    (globalThis as { erplora: Record<string, unknown> }).erplora.currencyDecimals = decimals;
  }

  it.each(SCALES)('create stores the typed price and cost in $currency minor units', async ({ decimals, typed, minor }) => {
    const el = await montar();
    setScale(decimals);
    const wc = el as unknown as { newName: string; newSku: string; newPrice: string; newCost: string;
                                  newTaxCategoryKey: string; createProduct: (ev: Event) => Promise<void> };
    wc.newName = 'Té';
    wc.newSku = 'TEA';
    wc.newPrice = typed;
    wc.newCost = typed;
    wc.newTaxCategoryKey = 'standard';
    await wc.createProduct(new Event('submit'));

    const create = comandos.find((c) => c.name === 'inventory.products.create');
    expect(create, 'the create was not sent').toBeTruthy();
    expect(create!.payload.price).toBe(minor);
    expect(create!.payload.cost).toBe(minor);
  });

  it.each(SCALES)('edit reopens the stored $currency amount as typed, and saves it unchanged', async ({ decimals, typed, minor }) => {
    (globalThis as Record<string, unknown>).erplora = {
      ...(globalThis as { erplora: object }).erplora,
      query: async (name: string) =>
        name === 'inventory.products.get'
          ? [{ id: 'p1', name: 'Té', sku: 'TEA', price: minor, cost: minor, stock: 0, tax_category_key: 'standard',
               is_active: 1, product_type: 'physical' }]
          : [],
    };
    const el = await montar();
    setScale(decimals);
    const wc = el as unknown as { onRowAction: (ev: CustomEvent) => Promise<void>; newPrice: string; newCost: string;
                                  createProduct: (ev: Event) => Promise<void> };
    await wc.onRowAction(new CustomEvent('rowAction', {
      detail: { actionId: 'edit', row: { id: 'p1', name: 'Té', sku: 'TEA', price: minor } },
    }) as CustomEvent);

    expect(Number(wc.newPrice), 'the field shows the amount a person reads').toBe(Number(typed));
    expect(Number(wc.newCost)).toBe(Number(typed));

    await wc.createProduct(new Event('submit'));
    const upd = comandos.find((c) => c.name === 'inventory.products.update');
    expect(upd, 'the update was not sent').toBeTruthy();
    expect(upd!.payload.price, 'opening and saving must not rescale the price').toBe(minor);
    expect(upd!.payload.cost).toBe(minor);
  });

  it.each(SCALES)('CSV import stores $currency prices in minor units', async ({ decimals, typed, minor }) => {
    const el = await montar();
    setScale(decimals);
    const wc = el as unknown as { onCsvImport: (ev: CustomEvent) => Promise<void>; confirmPreview: () => Promise<void> };
    await wc.onCsvImport(new CustomEvent('csv-import', {
      detail: { rows: [{ name: 'Té', sku: 'TEA', price: typed, cost: typed, tax_category: 'standard' }] },
    }));
    await wc.confirmPreview();

    const create = comandos.find((c) => c.name === 'inventory.products.create');
    expect(create, 'the CSV row was not created').toBeTruthy();
    expect(create!.payload.price).toBe(minor);
    expect(create!.payload.cost).toBe(minor);
  });

  // A yen price list writes thousands with a separator («1,200» / «1.200»). The comma-is-decimal
  // rule read it as 1,2 → 1 ¥: with no decimals in the currency, «sep + 3 digits» is a thousands group.
  it.each(['1,200', '1.200', '1200'])('CSV import in a yen hub reads «%s» as 1200 ¥, not 1 ¥', async (typed) => {
    const el = await montar();
    setScale(0);
    const wc = el as unknown as { onCsvImport: (ev: CustomEvent) => Promise<void>; confirmPreview: () => Promise<void> };
    await wc.onCsvImport(new CustomEvent('csv-import', {
      detail: { rows: [{ name: 'Té', sku: 'TEA', price: typed, tax_category: 'standard' }] },
    }));
    await wc.confirmPreview();

    expect(comandos.find((c) => c.name === 'inventory.products.create')!.payload.price).toBe(1200);
  });

  it('CSV import keeps the decimal comma where the currency has decimals («1,20» € → 120)', async () => {
    const el = await montar();
    setScale(2);
    const wc = el as unknown as { onCsvImport: (ev: CustomEvent) => Promise<void>; confirmPreview: () => Promise<void> };
    await wc.onCsvImport(new CustomEvent('csv-import', {
      detail: { rows: [{ name: 'Té', sku: 'TEA', price: '1,20', tax_category: 'standard' }] },
    }));
    await wc.confirmPreview();

    expect(comandos.find((c) => c.name === 'inventory.products.create')!.payload.price).toBe(120);
  });

  it.each(SCALES)('the money inputs step by the $currency smallest unit', async ({ decimals, step }) => {
    setScale(decimals);
    const el = await montar();
    const wc = el as unknown as { receiveTarget: Record<string, unknown> | null; requestUpdate: () => void;
                                  updateComplete: Promise<unknown>; shadowRoot: ShadowRoot };
    wc.receiveTarget = { id: 'p1', name: 'Té', sku: 'TEA', stock: 0, unit_code: 'ud' };
    wc.requestUpdate();
    await wc.updateComplete;

    for (const id of ['inventory-products-price', 'inventory-products-cost', 'inventory-products-receive-cost']) {
      const input = wc.shadowRoot.querySelector(`[data-testid="${id}"]`) as (HTMLElement & { step?: string }) | null;
      expect(input, `${id} is rendered`).toBeTruthy();
      expect(input!.step ?? input!.getAttribute('step'), id).toBe(step);
    }
  });
});

// pm#450 (outfitkit#150): editing opened the panel with open('create'), so its header said «New»
// while the body said «Editing product». The table knows an «edit» mode and takes the whole title:
// the screen asks for it and drops the repeated line from the body.
describe('editing titles the panel header, not its body (pm#450)', () => {
  type Table = HTMLElement & {
    open: (panel?: unknown, opts?: { title?: string }) => void;
    panel: string;
    shadowRoot: ShadowRoot;
  };
  type Screen = HTMLElement & {
    onRowAction: (ev: CustomEvent) => Promise<void>;
    cancelEdit: () => void;
    editingId: string | null;
    newName: string;
    updateComplete: Promise<unknown>;
  };
  const table = (el: HTMLElement) => el.shadowRoot!.querySelector('ok-data-table') as unknown as Table;
  const settle = async (el: Screen) => {
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;
  };
  const edit = (el: Screen) =>
    el.onRowAction(new CustomEvent('rowAction', {
      detail: { actionId: 'edit', row: { id: 'p1', name: 'Café solo', sku: 'CAF', price: 220 } },
    }) as CustomEvent);
  const mount = async () => (await montar()) as Screen;

  it("opens the panel with open('edit', { title }) — «Editing product — <name>» in the header", async () => {
    const el = await mount();
    const calls: unknown[][] = [];
    table(el).open = (...args: unknown[]) => void calls.push(args);
    await edit(el);
    await settle(el);
    expect(calls).toEqual([['edit', { title: 'ui.editingTitle — Café solo' }]]);
  });

  // The header only carries the title with OutfitKit ≥ 0.1.94 (outfitkit#150); an older shell
  // (hub:stable 1.1.29 ships 0.1.73) ignores it and keeps «New». The body line only goes away when
  // the table REALLY painted the title — its dialog is labelled with it — never on faith.
  const shellTable = (el: HTMLElement, honoursTitle: boolean) => {
    const t = table(el);
    const dialog = document.createElement('aside');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-label', 'Form');
    const root = document.createElement('div');
    root.appendChild(dialog);
    Object.defineProperty(t, 'shadowRoot', { value: root, configurable: true });
    // Like the real Lit table, open() only schedules the render: the dialog is labelled on the
    // next microtask and `updateComplete` resolves once it is. Reading the label before awaiting
    // it sees the old «Form» and keeps the line even when the header carries the title.
    let rendered: Promise<void> = Promise.resolve();
    Object.defineProperty(t, 'updateComplete', { get: () => rendered, configurable: true });
    t.open = (_panel?: unknown, opts?: { title?: string }) => {
      rendered = Promise.resolve().then(() => {
        if (honoursTitle && opts?.title) dialog.setAttribute('aria-label', opts.title);
      });
    };
  };
  const form = (el: HTMLElement) => el.shadowRoot!.querySelector('form[slot="create"]') as HTMLElement;

  it('the form body no longer repeats the editing title once the header carries it', async () => {
    const el = await mount();
    shellTable(el, true);
    await edit(el);
    await settle(el);
    expect(form(el).querySelector('[data-testid="inventory-products-editing"]')).toBeNull();
    expect(form(el).textContent).not.toContain('ui.editingTitle');
    expect(
      form(el).querySelector('[data-testid="inventory-products-edit-cancel"]'),
      'only the title moved to the header: «Cancel editing» stays in the form',
    ).toBeTruthy();
  });

  it('with a shell whose table ignores the title (OutfitKit < 0.1.94), the body keeps the editing line', async () => {
    const el = await mount();
    shellTable(el, false);
    await edit(el);
    await settle(el);
    const line = form(el).querySelector('[data-testid="inventory-products-editing"]') as HTMLElement | null;
    expect(line, 'the header says «New»: without this line nothing says it is an edit').toBeTruthy();
    expect(line!.textContent).toContain('ui.editingTitle');
    expect(line!.textContent).toContain('Café solo');
  });

  it('cancelling the edit hides the fallback line again', async () => {
    const el = await mount();
    shellTable(el, false);
    await edit(el);
    await settle(el);
    el.cancelEdit();
    await settle(el);
    expect(form(el).querySelector('[data-testid="inventory-products-editing"]')).toBeNull();
  });

  it('«Add» after an edit opens a CLEAN create form, and leaves the panel open', async () => {
    const el = await mount();
    await edit(el);
    await settle(el);
    const add = table(el).shadowRoot.querySelector('[data-testid="inventory-products-table-add"]') as HTMLElement;
    expect(add, 'the table paints its «Add» button').toBeTruthy();
    add.click();
    await settle(el);
    expect(el.editingId, 'a submit here would UPDATE the edited product under a «New» header').toBeNull();
    expect(el.newName).toBe('');
    expect(table(el).panel, '«Add» opened the create panel: resetting the form must not close it').toBe('create');
  });

  it('a click INSIDE the edit form (a field, a row) does not drop the edit — only «Add» does', async () => {
    const el = await mount();
    await edit(el);
    await settle(el);
    (el.shadowRoot!.querySelector('[data-testid="inventory-products-name"]') as HTMLElement).click();
    table(el).click();
    await settle(el);
    expect(el.editingId, 'the table host hears every click of the projected form').toBe('p1');
  });

  it('«Add» with no edit in progress keeps what was typed', async () => {
    const el = await mount();
    el.newName = 'Cortado';
    (table(el).shadowRoot.querySelector('[data-testid="inventory-products-table-add"]') as HTMLElement).click();
    await settle(el);
    expect(el.newName).toBe('Cortado');
  });
});

// pm#459: two «edit» taps in a row. Each opening awaits the full product (inventory.products.get),
// its categories (inventory.product_categories) and then the table render (updateComplete); the
// waits can resolve in the opposite order. The LAST opening wins: form, id, categories and header
// belong to the second row, never to a stale first reply.
describe('two «edit» in a row: the last opening wins (pm#459)', () => {
  type Table = HTMLElement & {
    open: (panel?: unknown, opts?: { title?: string }) => void;
    panel: string;
    shadowRoot: ShadowRoot;
  };
  type Screen = HTMLElement & {
    onRowAction: (ev: CustomEvent) => Promise<void>;
    cancelEdit: () => void;
    editingId: string | null;
    newName: string;
    newPrice: string;
    selectedCategoryIds: Set<string>;
    updateComplete: Promise<unknown>;
  };
  const table = (el: HTMLElement) => el.shadowRoot!.querySelector('ok-data-table') as unknown as Table;
  const settle = async (el: Screen) => {
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;
  };
  const ROW_A = { id: 'p1', name: 'Café solo', sku: 'CAF', price: 220 };
  const ROW_B = { id: 'p2', name: 'Cortado', sku: 'COR', price: 250 };
  const FULL: Record<string, Record<string, unknown>> = {
    p1: { ...ROW_A, tax_category_key: 'standard', is_active: 1 },
    p2: { ...ROW_B, tax_category_key: 'standard', is_active: 1 },
  };
  const LINKS = [
    { product_id: 'p1', category_id: 'c1' },
    { product_id: 'p2', category_id: 'c2' },
  ];
  const editRow = (el: Screen, row: Record<string, unknown>) =>
    el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'edit', row } }) as CustomEvent);
  /** The product reads answer at once, except the FIRST row's, which waits for `held`. */
  const hubHoldingFirst = (held: Promise<void>) => {
    const sdk = (globalThis as unknown as { erplora: Record<string, unknown> }).erplora;
    sdk.query = async (name: string, params?: Record<string, unknown>) => {
      if (name === 'inventory.product_categories') return LINKS;
      if (name !== 'inventory.products.get') return [];
      if (params?.product_id === 'p1') await held;
      return [FULL[String(params?.product_id)]];
    };
  };
  const mount = async () => (await montar()) as Screen;

  it('a slow reply for the FIRST row does not overwrite the form of the second', async () => {
    let releaseFirst: () => void = () => {};
    hubHoldingFirst(new Promise<void>((r) => (releaseFirst = r)));
    const el = await mount();
    const titles: (string | undefined)[] = [];
    table(el).open = (_panel?: unknown, opts?: { title?: string }) => void titles.push(opts?.title);
    const first = editRow(el, ROW_A);
    const second = editRow(el, ROW_B);
    await second;
    releaseFirst();
    await first;
    await settle(el);
    expect(el.editingId, 'a submit here would UPDATE the second product').toBe('p2');
    expect(el.newName, 'a submit here would write the FIRST product over the second').toBe('Cortado');
    expect(el.newPrice).toBe('2.50');
    expect([...el.selectedCategoryIds]).toEqual(['c2']);
    expect(titles.at(-1), 'the header names the row last tapped').toBe('ui.editingTitle — Cortado');
  });

  it('a slow CATEGORIES reply for the FIRST row does not overwrite the form of the second', async () => {
    // The product reads answer at once; only the FIRST opening's categories read is held, so the
    // second tap lands while the first is parked on its SECOND await.
    let releaseFirst: () => void = () => {};
    const held = new Promise<void>((r) => (releaseFirst = r));
    let categoryReads = 0;
    const sdk = (globalThis as unknown as { erplora: Record<string, unknown> }).erplora;
    sdk.query = async (name: string, params?: Record<string, unknown>) => {
      if (name === 'inventory.products.get') return [FULL[String(params?.product_id)]];
      if (name !== 'inventory.product_categories') return [];
      if (++categoryReads === 1) await held;
      return LINKS;
    };
    const el = await mount();
    table(el).open = () => {};
    const first = editRow(el, ROW_A);
    await new Promise((r) => setTimeout(r, 0));
    expect(categoryReads, 'the first opening is parked on its categories read').toBe(1);
    const second = editRow(el, ROW_B);
    await second;
    releaseFirst();
    await first;
    await settle(el);
    expect(el.editingId, 'a submit here would UPDATE the second product').toBe('p2');
    expect(el.newName, 'a submit here would write the FIRST product over the second').toBe('Cortado');
    expect([...el.selectedCategoryIds]).toEqual(['c2']);
  });

  it('cancelling while an edit is still loading keeps the clean create form', async () => {
    let releaseFirst: () => void = () => {};
    hubHoldingFirst(new Promise<void>((r) => (releaseFirst = r)));
    const el = await mount();
    const panels: unknown[] = [];
    table(el).open = (panel?: unknown) => void panels.push(panel);
    const first = editRow(el, ROW_A);
    el.cancelEdit();
    releaseFirst();
    await first;
    await settle(el);
    expect(el.editingId, 'a late reply must not turn the cancelled form into an edit').toBeNull();
    expect(el.newName).toBe('');
    expect(panels, 'a cancelled opening does not reopen the panel').toEqual([]);
  });

  it('«Add» while an edit is still loading keeps the clean create form, panel open', async () => {
    let releaseFirst: () => void = () => {};
    hubHoldingFirst(new Promise<void>((r) => (releaseFirst = r)));
    const el = await mount();
    const first = editRow(el, ROW_A);
    (table(el).shadowRoot.querySelector('[data-testid="inventory-products-table-add"]') as HTMLElement).click();
    releaseFirst();
    await first;
    await settle(el);
    expect(el.editingId, 'the header says «New»: a late reply must not turn it into an edit').toBeNull();
    expect(el.newName, 'a submit here would CREATE a copy of the first product').toBe('');
    expect(table(el).panel, '«Add» opened the create panel and it stays so').toBe('create');
  });

  it('when the FIRST render settles last, the body does not bring the editing line back', async () => {
    hubHoldingFirst(Promise.resolve());
    const el = await mount();
    const t = table(el);
    const dialog = document.createElement('aside');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-label', 'Form');
    const root = document.createElement('div');
    root.appendChild(dialog);
    Object.defineProperty(t, 'shadowRoot', { value: root, configurable: true });
    // The shell titles the header (OutfitKit ≥ 0.1.94); the first open's render is held and
    // resolves AFTER the second one.
    let releaseFirst: () => void = () => {};
    const firstHeld = new Promise<void>((r) => (releaseFirst = r));
    let opens = 0;
    let rendered: Promise<void> = Promise.resolve();
    Object.defineProperty(t, 'updateComplete', { get: () => rendered, configurable: true });
    t.open = (_panel: unknown, opts?: { title?: string }) => {
      const n = ++opens;
      const label = Promise.resolve().then(() => {
        if (opts?.title) dialog.setAttribute('aria-label', opts.title);
      });
      rendered = n === 1 ? label.then(() => firstHeld) : label;
    };
    // The first opening reaches its render (header «Café solo», held) before the second tap.
    const first = editRow(el, ROW_A);
    await new Promise((r) => setTimeout(r, 0));
    expect(opens).toBe(1);
    const second = editRow(el, ROW_B);
    await second;
    releaseFirst();
    await first;
    await settle(el);
    expect(dialog.getAttribute('aria-label')).toBe('ui.editingTitle — Cortado');
    expect(el.editingId).toBe('p2');
    expect(
      el.shadowRoot!.querySelector('form[slot="create"] [data-testid="inventory-products-editing"]'),
      'the header carries «Cortado»: a stale check against «Café solo» must not repaint the line',
    ).toBeNull();
  });
});

describe('the commercial categories ticked on a NEW product are saved with it (inventory#106)', () => {
  it('the create sends the ticked categories in the same command, atomically', async () => {
    const el = await montar();
    const wc = el as unknown as {
      newName: string; newSku: string; newPrice: string; newTaxCategoryKey: string;
      selectedCategoryIds: Set<string>;
      createProduct: (ev: Event) => Promise<void>;
    };
    wc.newName = 'Tinte rubio 7';
    wc.newSku = 'TIN7';
    wc.newPrice = '12.00';
    wc.newTaxCategoryKey = 'standard';
    wc.selectedCategoryIds = new Set(['cat-dyes', 'cat-retail']);
    await wc.createProduct(new Event('submit'));

    const create = comandos.find((c) => c.name === 'inventory.products.create');
    expect(create, 'the create was not sent').toBeTruthy();
    expect([...(create!.payload.category_ids as string[])].sort()).toEqual(['cat-dyes', 'cat-retail']);
  });

  it('the create schema accepts `category_ids` (additionalProperties is false)', () => {
    const schema = jsonDelModulo('schemas/product_create.json');
    expect(schema.properties.category_ids?.type).toBe('array');
    expect(schema.properties.category_ids?.items?.type).toBe('string');
  });
});

// inventory#105: on a phone (and a tablet) the table's panel is a full-height sheet that runs from
// the top of the shell's content area down to the bottom of the SCREEN, while the shell paints the
// module tabbar (an ion-footer outside the content) over its last ~66 px. The form's last control is
// Save: scrolled to the end, it still sat under the tabbar, and tapping it opened «Movements».
// Measured on the real shell at 390×844: sheet bottom 844, content bottom 778 (tabbar top).
// The form must leave that overlap free at its end so Save can scroll above the tabbar.
describe('Save stays above the shell tabbar in the mobile sheet (inventory#105)', () => {
  type Table = HTMLElement & { open: (panel?: unknown, opts?: { title?: string }) => void; shadowRoot: ShadowRoot };
  type Screen = HTMLElement & { onRowAction: (ev: CustomEvent) => Promise<void>; updateComplete: Promise<unknown> };
  const original = Element.prototype.getBoundingClientRect;
  const rect = (top: number, bottom: number) =>
    ({ top, bottom, left: 0, right: 390, width: 390, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
  /** Geometry of the shell: content area [193, contentBottom], sheet [193, sheetBottom]. */
  const layout = (contentBottom: number, sheetBottom: number) => {
    Element.prototype.getBoundingClientRect = function (this: Element) {
      if (this.tagName === 'ION-CONTENT') return rect(193, contentBottom);
      if (this.classList.contains('drawer')) return rect(193, sheetBottom);
      return original.call(this);
    };
  };
  afterEach(() => {
    Element.prototype.getBoundingClientRect = original;
    document.body.innerHTML = '';
  });
  const settle = async (el: Screen) => {
    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, 0));
      await el.updateComplete;
    }
  };
  /** Mounts the screen the way the shell does: inside an ion-content. */
  const mountInContent = async () => {
    await import('./erp-inventory-products');
    const content = document.createElement('ion-content');
    const el = document.createElement('erp-inventory-products') as unknown as Screen;
    content.appendChild(el);
    document.body.appendChild(content);
    await settle(el);
    return el;
  };
  const table = (el: HTMLElement) => el.shadowRoot!.querySelector('ok-data-table') as unknown as Table;
  const form = (el: HTMLElement) => el.shadowRoot!.querySelector('form[slot="create"]') as HTMLElement;
  const clickAdd = (el: HTMLElement) =>
    (table(el).shadowRoot.querySelector('[data-testid="inventory-products-table-add"]') as HTMLElement).click();

  it('«Add» on a phone: the form ends with the 66 px the tabbar covers, so Save scrolls clear of it', async () => {
    layout(778, 844);
    const el = await mountInContent();
    clickAdd(el);
    await settle(el);
    expect(form(el).style.paddingBottom, 'Save would stay under the tabbar').toBe('66px');
  });

  it('editing a product on a phone reserves the same space', async () => {
    layout(778, 844);
    const el = await mountInContent();
    await el.onRowAction(new CustomEvent('rowAction', {
      detail: { actionId: 'edit', row: { id: 'p1', name: 'Café solo', sku: 'CAF', price: 220 } },
    }) as CustomEvent);
    await settle(el);
    expect(form(el).style.paddingBottom).toBe('66px');
  });

  it('on desktop the panel already ends above the tabbar: nothing is added', async () => {
    layout(734, 718);
    const el = await mountInContent();
    clickAdd(el);
    await settle(el);
    expect(form(el).style.paddingBottom).toBe('');
  });

  it('rotating the phone re-measures the open sheet', async () => {
    layout(778, 844);
    const el = await mountInContent();
    clickAdd(el);
    await settle(el);
    layout(318, 390); // landscape: shorter screen, 72 px md tabbar
    window.dispatchEvent(new Event('resize'));
    await settle(el);
    expect(form(el).style.paddingBottom).toBe('72px');
  });
});
