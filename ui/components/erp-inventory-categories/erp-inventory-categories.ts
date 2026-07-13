import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { resolveTaxCategories, pickTaxValue, normalizeAlias } from '../../lib/tax-resolve';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn, DataTableAction } from '@erplora/outfitkit';
import { createListController } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';

// Vista "Categories" del módulo inventory: segundo data-table (categorías de producto).
// Mismo patrón que productos; el cliente sale de globalThis.erplora (mock en `erplora dev`).

interface ErploraClientLike extends ListClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  /** TODAS las filas, sin tope (salvo que pases `limit`). Para lo que no es «una página»: la
   *  rejilla de productos del TPV, un `<ion-select>` de categorías fiscales, el mapa
   *  producto↔categoría. El viejo `page_size` NO era un parámetro del runtime: truncaba a 50. */
  queryAll<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T[]>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  product_count: number;
  tax_category_key: string | null;
}

// Fila de `taxes.categories.list` (la CATEGORÍA fiscal es lo enlazable, ADR-0085).
interface TaxCategory {
  id: string;
  key: string;
  name: string;
  is_system?: number;
}

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

export class ErpInventoryCategories extends LitElement {
  static styles = css`
    :host { display: flex; flex-direction: column; height: 100%; min-height: 0; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    .page { display: flex; flex-direction: column; min-height: 0; flex: 1 1 auto; gap: 0.75rem; }
    .page > ok-data-table { flex: 1 1 auto; min-height: 0; }
    .form { display: flex; flex-direction: column; gap: 0.7rem; }
    .form ion-button { align-self: flex-end; }
    .err { color: #d9480f; font-weight: 600; margin: 0; }
  `;

  @state() private newName = '';
  @state() private newSlug = '';
  @state() private newTaxRateId = ''; // '' = tipo por defecto del hub (se envía null)
  @state() private taxRates: TaxCategory[] = [];
  @state() private saving = false;
  @state() private formError = '';

  private ctrl!: ListController<Category>;

  private columns: DataTableColumn[] = [
    { key: 'name', header: 'Nombre', sortable: true, filterable: true, filterType: 'text' },
    { key: 'slug', header: 'Slug', sortable: true, filterable: true, filterType: 'text' },
    { key: 'product_count', header: 'Productos', align: 'right', sortable: true, filterable: true, filterType: 'range' },
  ];

  private actions: DataTableAction[] = [
    { id: 'edit', label: 'Editar', icon: 'create-outline' },
    { id: 'delete', label: 'Eliminar', icon: 'trash-outline', color: 'danger' },
  ];

  async firstUpdated(): Promise<void> {
    this.ctrl = createListController<Category>(erplora(), 'inventory.categories.list', () => this.requestUpdate(), {
      pageSize: 25,
      sort: 'name',
      dir: 'asc',
    });
    await this.ctrl.load();
    void this.loadTaxRates();
  }

  // Carga los tipos de IVA/impuesto para el selector del formulario (ADR-0066/0069). Best-effort:
  // si falla (módulo `taxes` no instalado, sin permiso…), el select queda con solo "— (por defecto)"
  // y el alta sigue funcionando (tax_category_key = null = tipo por defecto del hub).
  private async loadTaxRates(): Promise<void> {
    try {
      this.taxRates = await erplora().queryAll<TaxCategory>('taxes.categories.list', { sort: 'name', dir: 'asc' });
    } catch {
      this.taxRates = [];
    }
  }

  // Opciones del ion-select: "— (sin categoría)" (valor '') + una categoría por fila (value = key).
  private taxOptions() {
    return html`
      <ion-select-option value="">— (sin categoría)</ion-select-option>
      ${this.taxRates.map(
        (c) => html`<ion-select-option .value=${c.key}>${c.name} (${c.key})</ion-select-option>`,
      )}
    `;
  }

  private async onRowAction(ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>): Promise<void> {
    const { actionId, row } = ev.detail;
    const c = row as unknown as Category;
    if (actionId === 'edit') {
      this.newName = c.name;
      this.newSlug = c.slug;
      this.newTaxRateId = c.tax_category_key ?? ''; // pre-selecciona el tipo de IVA actual
      this.dataTable()?.open('create');
    } else if (actionId === 'delete') {
      try {
        await erplora().command('inventory.categories.delete', { category_id: c.id });
        await this.ctrl.load();
      } catch (e) {
        this.formError = e instanceof Error ? e.message : 'No se pudo eliminar';
      }
    }
  }

  private dataTable(): { open(p?: 'filters' | 'create'): void; close(): void } | null {
    return this.renderRoot.querySelector('ok-data-table') as
      | { open(p?: 'filters' | 'create'): void; close(): void }
      | null;
  }

  // Importa categorías desde CSV (cabeceras = name, slug…). Crea una por fila.
  // Cada fila resuelve su tipo de IVA por referencia (ADR-0066), igual que el import de productos:
  // la columna fiscal (tax/iva/vat/…) se matchea contra los tipos existentes de `taxes`, los que
  // falten (con un % real) se crean en bloque, y la categoría enlaza por `tax_category_key`. Vacío / sin
  // columna → null = tipo por defecto del hub. NO se convierten precios.
  private async onCsvImport(ev: CustomEvent<{ rows: Record<string, string>[] }>): Promise<void> {
    const rows = ev.detail.rows ?? [];

    // 1) Resolver la CATEGORÍA fiscal de cada fila (ADR-0085) ANTES del bucle de creación.
    let map = new Map<string, string>();
    let unresolved: string[] = [];
    try {
      const res = await resolveTaxCategories(rows, erplora());
      map = res.map;
      unresolved = res.unresolved;
      if (unresolved.length > 0) {
        // TODO(UI ADR-0085): preguntar (elegir/crear) + persistir alias (learnAlias). De momento avisa.
        console.warn('[inventory] Categorías fiscales sin resolver (categorías sin categoría fiscal):', unresolved);
      }
    } catch (e) {
      console.warn('[inventory] No se pudieron resolver las categorías fiscales del CSV:', e);
    }

    // 2) Crear las categorías enlazando su tax_category_key (o null = tipo por defecto del hub).
    let linked = 0;
    for (const r of rows) {
      if (!r.name) continue;
      const taxValue = pickTaxValue(r);
      const taxRateId = taxValue ? (map.get(normalizeAlias(taxValue)) ?? null) : null;
      if (taxRateId) linked++;
      try {
        await erplora().command('inventory.categories.create', {
          name: r.name,
          slug: r.slug || r.name.toLowerCase().replace(/\s+/g, '-'),
          tax_category_key: taxRateId,
        });
      } catch {
        /* ignora */
      }
    }
    if (linked > 0 || unresolved.length > 0) {
      console.info(`[inventory] Import CSV: ${linked} categorías enlazadas por categoría fiscal, ${unresolved.length} sin resolver.`);
    }
    await this.ctrl.load();
  }

  private async create(ev: Event): Promise<void> {
    ev.preventDefault();
    if (!this.newName.trim()) return;
    this.saving = true;
    this.formError = '';
    try {
      await erplora().command('inventory.categories.create', {
        name: this.newName.trim(),
        slug: this.newSlug.trim() || this.newName.trim().toLowerCase().replace(/\s+/g, '-'),
        tax_category_key: this.newTaxRateId || null,
      });
      this.newName = '';
      this.newSlug = '';
      this.newTaxRateId = '';
      this.dataTable()?.close();
      await this.ctrl.load();
    } catch (e) {
      this.formError = e instanceof Error ? e.message : 'No se pudo crear';
    } finally {
      this.saving = false;
    }
  }

  render() {
    return html`
      <div class="page">
        ${this.formError ? html`<p class="err">${this.formError}</p>` : nothing}
        ${this.ctrl?.error ? html`<p class="err">${this.ctrl.error}</p>` : nothing}

        <ok-data-table
          .serverSide=${true}
          .fill=${true}
          .columns=${this.columns}
          .actions=${this.actions}
          .addable=${true}
          .views=${true}
          .columnPicker=${true}
          .csv=${true}
          .csvName=${'inventory-categories.csv'}
          @csvImport=${(e: CustomEvent<{ rows: Record<string, string>[] }>) => this.onCsvImport(e)}
          @rowAction=${(e: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => this.onRowAction(e)}
          .rows=${this.ctrl?.rows ?? []}
          .total=${this.ctrl?.total ?? 0}
          .page=${this.ctrl?.state.page ?? 0}
          .pageSize=${this.ctrl?.state.pageSize ?? 25}
          .sort=${this.ctrl?.state.sort}
          .sortDir=${this.ctrl?.state.dir ?? 'asc'}
          .searchable=${true}
          .searchPlaceholder=${'Buscar categoría…'}
          .emptyMessage=${this.ctrl?.loading ? 'Cargando…' : 'Sin categorías.'}
          @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)}
          @pageSizeChange=${(e: CustomEvent<number>) => this.ctrl.setPageSize(e.detail)}
          @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) =>
            this.ctrl.setSort(e.detail.sort, e.detail.dir)}
          @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)}
          @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) =>
            this.ctrl.setFilter(e.detail.col, e.detail.value)}
        >
          <form slot="create" class="form" @submit=${(e: Event) => this.create(e)}>
            <ion-input
              fill="outline"
              label="Nombre"
              label-placement="floating"
              .value=${this.newName}
              @ionInput=${(e: Event) => (this.newName = (e.target as HTMLInputElement).value)}
            ></ion-input>
            <ion-input
              fill="outline"
              label="Slug (opcional)"
              label-placement="floating"
              .value=${this.newSlug}
              @ionInput=${(e: Event) => (this.newSlug = (e.target as HTMLInputElement).value)}
            ></ion-input>
            <ion-select
              fill="outline"
              label-placement="floating"
              label="Tipo de IVA / Impuesto"
              .value=${this.newTaxRateId}
              @ionChange=${(e: Event) => (this.newTaxRateId = (e.target as HTMLInputElement).value)}
            >
              ${this.taxOptions()}
            </ion-select>
            <ion-button type="submit" ?disabled=${this.saving || !this.newName}>
              ${this.saving ? 'Guardando…' : 'Guardar'}
            </ion-button>
          </form>
        </ok-data-table>
      </div>
    `;
  }
}

define('erp-inventory-categories', ErpInventoryCategories);
