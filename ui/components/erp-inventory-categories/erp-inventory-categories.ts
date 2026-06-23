import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn, DataTableAction } from '@erplora/outfitkit';
import { createListController } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';

// Vista "Categories" del módulo inventory: segundo data-table (categorías de producto).
// Mismo patrón que productos; el cliente sale de globalThis.erplora (mock en `erplora dev`).

interface ErploraClientLike extends ListClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  product_count: number;
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
  }

  private async onRowAction(ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>): Promise<void> {
    const { actionId, row } = ev.detail;
    const c = row as unknown as Category;
    if (actionId === 'edit') {
      this.newName = c.name;
      this.newSlug = c.slug;
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

  private async onCsvImport(ev: CustomEvent<{ rows: Record<string, string>[] }>): Promise<void> {
    for (const r of ev.detail.rows ?? []) {
      if (!r.name) continue;
      try {
        await erplora().command('inventory.categories.create', {
          name: r.name,
          slug: r.slug || r.name.toLowerCase().replace(/\s+/g, '-'),
        });
      } catch {
        /* ignora */
      }
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
      });
      this.newName = '';
      this.newSlug = '';
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
