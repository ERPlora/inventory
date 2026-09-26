// Edición REAL y borrado con impacto de categorías (inventory#8).
//
// Bugs que fija este contrato: «Editar» abría el form de alta pero el submit llamaba a
// `categories.create` (duplicado silencioso), y el borrado no enseñaba cuántos productos
// quedaban desvinculados.
import { beforeEach, describe, expect, it } from 'vitest';

const comandos: { name: string; payload: Record<string, unknown> }[] = [];
const consultas: string[] = [];

beforeEach(() => {
  document.body.innerHTML = '';
  comandos.length = 0;
  consultas.length = 0;
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      consultas.push(name);
      return name === 'inventory.product_categories'
        ? [
            { product_id: 'p1', category_id: 'c1' },
            { product_id: 'p2', category_id: 'c1' },
            { product_id: 'p3', category_id: 'c2' },
          ]
        : [];
    },
    queryPage: async () => ({
      rows: [{ id: 'c1', name: 'Bebidas', slug: 'bebidas', tax_category_key: null }],
      total: 1, limit: 50, offset: 0,
    }),
    command: async (name: string, payload: Record<string, unknown>) => {
      comandos.push({ name, payload });
      return {};
    },
    currency: 'EUR',
    formatMoney: (c: number) => `${(c / 100).toFixed(2)} €`,
    formatAmount: (u: number) => `${u.toFixed(2)} €`,
    t: (_c: unknown, key: string) => key,
    loadSlot: async () => [],
  };
});

async function montar() {
  await import('./erp-inventory-categories');
  const el = document.createElement('erp-inventory-categories');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as HTMLElement & { updateComplete: Promise<unknown> };
}

describe('edición real de categorías (inventory#8)', () => {
  it('Editar fija el estado y el submit llama a categories.update, nunca a create', async () => {
    const el = await montar();
    const wc = el as unknown as {
      onRowAction: (ev: CustomEvent) => Promise<void>;
      editingId: string | null;
      create: (ev: Event) => Promise<void>; updateComplete: Promise<unknown>;
    };
    await wc.onRowAction(new CustomEvent('rowAction', {
      detail: { actionId: 'edit', row: { id: 'c1', name: 'Bebidas', slug: 'bebidas', tax_category_key: null } },
    }) as CustomEvent);
    expect(wc.editingId).toBe('c1');

    await wc.create(new Event('submit'));
    const upd = comandos.find((c) => c.name === 'inventory.categories.update');
    expect(upd, 'submit en edición = update').toBeTruthy();
    expect(upd!.payload.category_id).toBe('c1');
    expect(comandos.find((c) => c.name === 'inventory.categories.create'),
      'el bug de #8: editar creaba un duplicado').toBeFalsy();
  });

  it('cancelar la edición limpia el estado', async () => {
    const el = await montar();
    const wc = el as unknown as { editingId: string | null; newName: string; cancelEdit: () => void };
    wc.editingId = 'c1';
    wc.newName = 'Bebidas';
    wc.cancelEdit();
    expect(wc.editingId).toBeNull();
    expect(wc.newName).toBe('');
  });
});

describe('borrado con impacto visible (inventory#8)', () => {
  it('Borrar NO ejecuta directo: abre confirmación con el nº de productos vinculados', async () => {
    const el = await montar();
    const wc = el as unknown as {
      onRowAction: (ev: CustomEvent) => Promise<void>;
      deleteTarget: { id: string } | null; deleteImpact: number;
      updateComplete: Promise<unknown>;
    };
    await wc.onRowAction(new CustomEvent('rowAction', {
      detail: { actionId: 'delete', row: { id: 'c1', name: 'Bebidas', product_count: 2 } },
    }) as CustomEvent);
    expect(comandos.find((c) => c.name === 'inventory.categories.delete'),
      'sin confirmación no se borra').toBeFalsy();
    expect(wc.deleteTarget?.id).toBe('c1');
    expect(wc.deleteImpact, 'c1 tiene 2 productos vinculados').toBe(2);
  });

  it('el impacto sale de la fila, sin traerse el mapa entero producto↔categoría', async () => {
    // La cifra ya viaja en la fila (`product_count` de `categories.list`, la misma columna que se
    // ve en la rejilla). Pedir `inventory.product_categories` para contarla traía UNA FILA POR
    // PAREJA producto-categoría de todo el catálogo —miles en una tienda real— para pintar un
    // número que ya estaba en pantalla, y con el mostrador esperando.
    const el = await montar();
    const wc = el as unknown as {
      onRowAction: (ev: CustomEvent) => Promise<void>; deleteImpact: number;
    };
    await wc.onRowAction(new CustomEvent('rowAction', {
      detail: { actionId: 'delete', row: { id: 'c1', name: 'Bebidas', product_count: 7 } },
    }) as CustomEvent);
    expect(wc.deleteImpact).toBe(7);
    expect(consultas, 'el mapa del TPV no se descarga para contar').not.toContain('inventory.product_categories');
  });

  it('confirmar ejecuta el borrado (política: desvincular, los productos siguen)', async () => {
    const el = await montar();
    const wc = el as unknown as {
      deleteTarget: { id: string } | null; deleteImpact: number;
      confirmDelete: () => Promise<void>;
    };
    wc.deleteTarget = { id: 'c1' };
    await wc.confirmDelete();
    const del = comandos.find((c) => c.name === 'inventory.categories.delete');
    expect(del?.payload.category_id).toBe('c1');
    expect(wc.deleteTarget).toBeNull();
  });
});

// ── inventory#64 ────────────────────────────────────────────────────────────────────────────────
// El selector de categoría FISCAL de esta pantalla enseñaba el inglés del seed. `taxes` ≥ 2.3.8 ya
// sirve la etiqueta traducida por el contrato (`display_name`, taxes#38/#40); aquí solo hay que
// leerla — y ordenar por ella, que es lo que el usuario ve.
describe('el selector de categoría fiscal enseña la etiqueta traducida (inventory#64)', () => {
  const CANONICA = {
    id: 't1', key: 'product.generic',
    name: 'Product — generic',
    display_name: 'Producto — general',
  };

  function conCatalogo(cats: Record<string, unknown>[]) {
    const llamadas: { name: string; params?: Record<string, unknown> }[] = [];
    const sdk = (globalThis as Record<string, any>).erplora;
    sdk.queryAll = async (name: string, params?: Record<string, unknown>) => {
      llamadas.push({ name, params });
      return name === 'taxes.categories.list' ? cats : [];
    };
    return llamadas;
  }

  function opciones(el: HTMLElement): string[] {
    return [...(el.shadowRoot?.querySelectorAll('ion-select-option') ?? [])].map(
      (o) => (o.textContent ?? '').trim(),
    );
  }

  it('pinta «Producto — general», no el inglés del seed', async () => {
    conCatalogo([CANONICA]);
    const el = await montar();
    const texto = opciones(el).join(' | ');
    expect(texto).toContain('Producto — general');
    expect(texto).not.toContain('Product — generic');
  });

  it('sin `display_name` (taxes viejo) cae a `name`: ninguna opción se queda muda', async () => {
    conCatalogo([{ id: 't1', key: 'product.generic', name: 'Product — generic' }]);
    const el = await montar();
    expect(opciones(el).join(' | ')).toContain('Product — generic');
  });

  it('pide el catálogo ordenado por lo que se enseña', async () => {
    const llamadas = conCatalogo([CANONICA]);
    await montar();
    const cat = llamadas.find((l) => l.name === 'taxes.categories.list');
    expect(cat).toBeTruthy();
    expect(cat!.params?.sort).toBe('display_name');
  });
});

// ── pm#155 (outfitkit#67, second half) ────────────────────────────────────────────────────────
//
// At 1440 px the «Actions» column fell off the screen with nothing hinting the table went on to
// the right, so the only door into a category was a button nobody could see. OutfitKit 0.1.44
// pins that column, but the other half of the fix is opt-in: `rowClickable` turns the whole row
// into a door — the first thing a user tries. The list has to ask for it, and wire `rowClick`
// to the same edit panel the «edit» action opens (a REAL edit: the submit does update, inventory#8).
describe('clicking the row opens the category (pm#155)', () => {
  const CATEGORIA = { id: 'c1', name: 'Bebidas', slug: 'bebidas', tax_category_key: null };

  it('the table declares `rowClickable` → the whole row is a door, not just the action button', async () => {
    const el = await montar();
    const table = el.shadowRoot?.querySelector('ok-data-table') as (HTMLElement & { rowClickable: boolean }) | null;
    expect(
      table?.rowClickable,
      'without `rowClickable` the row is dead: if the actions column is off-screen there is no way in',
    ).toBe(true);
  });

  it('`rowClick` puts the category in the edit panel, same as the «edit» action', async () => {
    const el = await montar();
    const table = el.shadowRoot?.querySelector('ok-data-table') as HTMLElement | null;
    table!.dispatchEvent(new CustomEvent('rowClick', { detail: { row: CATEGORIA } }));
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    const wc = el as unknown as { editingId: string | null; editRow: unknown };
    expect(wc.editingId, 'the row was clicked and the edit panel did not take the category').toBe('c1');
    expect(wc.editRow).toEqual(CATEGORIA);
  });
});

// ── inventory#67 ────────────────────────────────────────────────────────────────────────────────
//
// ONE format for the fiscal category, module-wide. inventory#58 took the technical key out of the
// selector and put the rate in front of it; inventory#64 put the translated label on top. Both
// landed in `taxCategoryOptionLabel()`, and THIS screen never called it — it composed the option by
// hand as `${name} (${key})`, so the same datum read two ways in the same module:
//
//     Alta de producto     →  Producto — general · 21 %
//     Categorías (aquí)    →  Producto — general (product.generic)
//
// The market decides the tie, and it decides it the same way everywhere a tax category is picked
// (Odoo, Business Central, Square, Shopify, Holded): the name plus the rate the invoice will carry,
// never the internal code. The key is what gets SAVED, not what gets read. Two ways of painting one
// datum is how drift comes back, so the screen reuses the helper instead of copying its format.
describe('el selector fiscal usa el MISMO formato que el alta: nombre · % (inventory#67)', () => {
  const CANONICA = {
    id: 't1',
    key: 'product.generic',
    name: 'Product — generic',
    display_name: 'Producto — general',
  };

  /** Serves BOTH contracts of `taxes`: the categories catalogue and the rules the rate comes from. */
  function conTaxes(
    cats: Record<string, unknown>[],
    reglas: Record<string, unknown>[],
  ): { name: string; params?: Record<string, unknown> }[] {
    const llamadas: { name: string; params?: Record<string, unknown> }[] = [];
    const sdk = (globalThis as Record<string, any>).erplora;
    sdk.queryAll = async (name: string, params?: Record<string, unknown>) => {
      llamadas.push({ name, params });
      if (name === 'taxes.categories.list') return cats;
      if (name === 'taxes.rules.list') return reglas;
      return [];
    };
    return llamadas;
  }

  function opciones(el: HTMLElement): string[] {
    return [...(el.shadowRoot?.querySelectorAll('ion-select-option') ?? [])].map(
      (o) => (o.textContent ?? '').trim(),
    );
  }

  const REGLA_21 = {
    id: 'r1',
    tax_category_key: 'product.generic',
    rate_pct: 21,
    parent_id: null,
    valid_from: '2024-01-01',
    operation_class: 'subject',
  };

  it('pinta el % aplicable y NO la clave técnica', async () => {
    conTaxes([CANONICA], [REGLA_21]);
    const el = await montar();
    const texto = opciones(el).join(' | ');
    expect(texto, 'el dato por el que se elige una categoría fiscal es el tipo que aplica').toContain(
      'Producto — general · 21 %',
    );
    expect(
      texto,
      'la clave canónica es lo que se GUARDA, no lo que se lee: `(product.generic)` es ruido',
    ).not.toContain('(product.generic)');
  });

  it('CONTROL: sin `taxes.rules.list` el control cazaría el positivo (la aserción del % no pasa sola)', async () => {
    // Without the rules there is no rate to show, so the assertion above MUST fail here. A test
    // that stays green with the data removed is not testing the data.
    conTaxes([CANONICA], []);
    const el = await montar();
    expect(opciones(el).join(' | ')).not.toContain('· 21 %');
  });

  it('el % lo trae `taxes.rules.list` — aquí no se recalcula ningún tipo (ADR-0085)', async () => {
    const llamadas = conTaxes([CANONICA], [REGLA_21]);
    await montar();
    expect(
      llamadas.find((l) => l.name === 'taxes.rules.list'),
      'el tipo vive en `taxes` (país+región+categoría+fecha) y se lee por su query pública',
    ).toBeTruthy();
  });

  it('`taxes` degradado: la opción sigue siendo el nombre, nunca se queda muda', async () => {
    const sdk = (globalThis as Record<string, any>).erplora;
    sdk.queryAll = async (name: string) => {
      if (name === 'taxes.categories.list') return [CANONICA];
      throw new Error('taxes down');
    };
    const el = await montar();
    expect(opciones(el).join(' | ')).toContain('Producto — general');
  });

  it('mismo formato que el alta: la opción ES lo que devuelve `taxCategoryOptionLabel`', async () => {
    // The contract of inventory#67 is not «this string»: it is that ONE helper owns the format for
    // the whole module. Comparing against the helper is what keeps the two screens from drifting
    // apart again the next time the format changes.
    const { taxCategoryOptionLabel } = await import('../../lib/tax-category-option');
    conTaxes([CANONICA], [REGLA_21]);
    const el = await montar();
    const esperado = taxCategoryOptionLabel(
      CANONICA,
      new Map([['product.generic', { pct: 21, exempt: false }]]),
      (k: string) => k,
    );
    expect(opciones(el)).toContain(esperado);
  });
});

// pm#450 (outfitkit#150): editing opened the panel with open('create'), so its header said «New»
// over a pre-filled category — nothing on screen said it was an edit. The table knows an «edit»
// mode and takes the whole title: the screen asks for «Editing category — <name>».
describe('editing titles the panel header, not its body (pm#450)', () => {
  type Table = HTMLElement & { open: (panel?: unknown, opts?: { title?: string }) => void; shadowRoot: ShadowRoot };
  type Screen = HTMLElement & {
    onRowAction: (ev: CustomEvent) => Promise<void>;
    cancelEdit: () => void;
    editingId: string | null;
    newName: string;
    updateComplete: Promise<unknown>;
  };
  const table = (el: HTMLElement) => el.shadowRoot!.querySelector('ok-data-table') as Table;
  const settle = async (el: Screen) => {
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;
  };
  const edit = (el: Screen) =>
    el.onRowAction(new CustomEvent('rowAction', {
      detail: { actionId: 'edit', row: { id: 'c1', name: 'Bebidas', slug: 'bebidas', tax_category_key: null } },
    }) as CustomEvent);
  const mount = async () => (await montar()) as Screen;
  const form = (el: HTMLElement) => el.shadowRoot!.querySelector('form[slot="create"]') as HTMLElement;

  it("opens the panel with open('edit', { title }) — «Editing category — <name>» in the header", async () => {
    const el = await mount();
    const calls: unknown[][] = [];
    table(el).open = (...args: unknown[]) => void calls.push(args);
    await edit(el);
    await settle(el);
    expect(calls).toEqual([['edit', { title: 'ui.editingCategoryTitle — Bebidas' }]]);
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
    // next microtask and `updateComplete` resolves once it is.
    let rendered: Promise<void> = Promise.resolve();
    Object.defineProperty(t, 'updateComplete', { get: () => rendered, configurable: true });
    t.open = (_panel?: unknown, opts?: { title?: string }) => {
      rendered = Promise.resolve().then(() => {
        if (honoursTitle && opts?.title) dialog.setAttribute('aria-label', opts.title);
      });
    };
  };

  it('the form body does not repeat the editing title once the header carries it', async () => {
    const el = await mount();
    shellTable(el, true);
    await edit(el);
    await settle(el);
    expect(form(el).querySelector('[data-testid="inventory-categories-editing"]')).toBeNull();
    expect(form(el).textContent).not.toContain('ui.editingCategoryTitle');
  });

  it('with a shell whose table ignores the title (OutfitKit < 0.1.94), the body says it is an edit', async () => {
    const el = await mount();
    shellTable(el, false);
    await edit(el);
    await settle(el);
    const line = form(el).querySelector('[data-testid="inventory-categories-editing"]') as HTMLElement | null;
    expect(line, 'the header says «New»: without this line nothing says it is an edit').toBeTruthy();
    expect(line!.textContent).toContain('ui.editingCategoryTitle');
    expect(line!.textContent).toContain('Bebidas');
  });

  it('cancelling the edit hides the fallback line again', async () => {
    const el = await mount();
    shellTable(el, false);
    await edit(el);
    await settle(el);
    el.cancelEdit();
    await settle(el);
    expect(form(el).querySelector('[data-testid="inventory-categories-editing"]')).toBeNull();
  });

  it('«Add» after an edit opens a CLEAN create form', async () => {
    const el = await mount();
    await edit(el);
    await settle(el);
    const add = table(el).shadowRoot.querySelector('[data-testid="inventory-categories-table-add"]') as HTMLElement;
    expect(add, 'the table paints its «Add» button').toBeTruthy();
    add.click();
    await settle(el);
    expect(el.editingId, 'a submit here would UPDATE the edited category under a «New» header').toBeNull();
    expect(el.newName).toBe('');
  });

  it('a click INSIDE the edit form (a field, a row) does not drop the edit — only «Add» does', async () => {
    const el = await mount();
    await edit(el);
    await settle(el);
    (el.shadowRoot!.querySelector('[data-testid="inventory-categories-name"]') as HTMLElement).click();
    table(el).click();
    await settle(el);
    expect(el.editingId, 'the table host hears every click of the projected form').toBe('c1');
  });

  it('«Add» with no edit in progress keeps what was typed', async () => {
    const el = await mount();
    el.newName = 'Postres';
    (table(el).shadowRoot.querySelector('[data-testid="inventory-categories-table-add"]') as HTMLElement).click();
    await settle(el);
    expect(el.newName).toBe('Postres');
  });

  it('the new header title has its en AND es string', async () => {
    // Relative to THIS file: a cwd-based lookup would read the base checkout, not the module under test.
    const locales = {
      en: (await import('../../../locales/en.json')).default,
      es: (await import('../../../locales/es.json')).default,
    };
    for (const [lang, catalog] of Object.entries(locales)) {
      const ui = (catalog as { ui: Record<string, string> }).ui;
      expect(ui.editingCategoryTitle, `locales/${lang}.json`).toBeTruthy();
    }
  });
});
