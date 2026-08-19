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
