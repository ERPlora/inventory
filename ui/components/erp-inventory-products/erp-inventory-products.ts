import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
// `define` por su subpath ligero: importar el barrel '@erplora/outfitkit' arrastraría (efectos
// secundarios) el registro de TODOS los ok-* al bundle del módulo. `ok-data-table` se importa por
// su efecto secundario (se auto-registra). Tipos desde el barrel (se borran en build).
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn } from '@erplora/outfitkit';
import { createListController } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';

// Web Component del módulo `inventory` (Lit). Mini-app: lista de productos paginada server-side
// (búsqueda + orden + filtro por columna vía el runtime) + alta rápida.
//
// 90% de la lógica vive en Rust: este componente NO toca la BD; llama al SDK
// (erplora.query/queryPage/command/on). El cliente se obtiene de `globalThis.erplora`.

interface ErploraClientLike extends ListClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  is_active: number;
}

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

export class ErpInventoryProducts extends LitElement {
  static styles = css`
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    header { display:flex; gap:.5rem; align-items:center; margin-bottom:.75rem; }
    h2 { margin:0; font-size:1.15rem; flex:1; }
    .form { display:flex; gap:.5rem; flex-wrap:wrap; align-items:end; margin:.5rem 0 1rem; }
    .form ion-input { --background:var(--surface-2,#f7f4ec); border:1px solid var(--ion-border-color,#e0ddd4); border-radius:8px; flex:1; min-width:7rem; }
    .err { color:#d9480f; font-weight:600; }
  `;

  @state() private newName = '';
  @state() private newSku = '';
  @state() private newPrice = '';
  @state() private saving = false;
  @state() private formError = '';

  private ctrl!: ListController<Product>;
  private unsub?: () => void;

  private columns: DataTableColumn[] = [
    { key: 'name', header: 'Nombre', sortable: true, filterable: true, filterType: 'text' },
    { key: 'sku', header: 'SKU', sortable: true, filterable: true, filterType: 'text' },
    {
      key: 'price',
      header: 'Precio',
      align: 'right',
      sortable: true,
      filterable: true,
      filterType: 'range',
      format: (r) => Number(r.price).toFixed(2),
    },
    { key: 'stock', header: 'Stock', align: 'right', sortable: true, filterable: true, filterType: 'range' },
    {
      key: 'is_active',
      header: 'Activo',
      align: 'center',
      filterable: true,
      filterType: 'select',
      options: [
        { value: '1', label: 'Sí' },
        { value: '0', label: 'No' },
      ],
      format: (r) => (r.is_active ? '✓' : '—'),
    },
  ];

  // Init una sola vez tras el primer render (equivalente a `componentWillLoad` de Stencil: el shell
  // crea una instancia nueva del WC en cada montaje de la vista). El re-render lo dispara el
  // controlador vía `requestUpdate()` (sustituye al antiguo `this.tick++`), no un @state.
  async firstUpdated(): Promise<void> {
    this.ctrl = createListController<Product>(
      erplora(),
      'inventory.products.list',
      () => this.requestUpdate(),
      { pageSize: 50, sort: 'name', dir: 'asc' },
    );
    await this.ctrl.load();
    // Reactividad: al cambiar stock o crearse un producto, recargamos la página actual.
    try {
      const off1 = erplora().on('inventory.stock_changed', () => this.ctrl.load());
      const off2 = erplora().on('inventory.product.created', () => this.ctrl.load());
      this.unsub = () => {
        off1();
        off2();
      };
    } catch {
      /* sin SDK (preview) → sin reactividad en vivo */
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unsub?.();
  }

  private async createProduct(ev: Event): Promise<void> {
    ev.preventDefault();
    if (!this.newName.trim() || !this.newSku.trim()) return;
    this.saving = true;
    this.formError = '';
    try {
      await erplora().command('inventory.products.create', {
        name: this.newName.trim(),
        sku: this.newSku.trim(),
        price: Number(this.newPrice) || 0,
        cost: 0,
        stock: 0,
        low_stock_threshold: 10,
        product_type: 'physical',
        ean13: null,
        description: '',
        tax_class_id: null,
        image: '',
      });
      this.newName = '';
      this.newSku = '';
      this.newPrice = '';
      await this.ctrl.load(); // refresco inmediato (además del evento)
    } catch (e) {
      this.formError = e instanceof Error ? e.message : 'No se pudo crear';
    } finally {
      this.saving = false;
    }
  }

  render() {
    return html`
      <div>
        <header>
          <h2>Productos</h2>
        </header>

        <form class="form" @submit=${(e: Event) => this.createProduct(e)}>
          <ion-input
            placeholder="Nombre"
            .value=${this.newName}
            @ionInput=${(e: Event) => (this.newName = (e.target as HTMLInputElement).value)}
          ></ion-input>
          <ion-input
            placeholder="SKU"
            .value=${this.newSku}
            @ionInput=${(e: Event) => (this.newSku = (e.target as HTMLInputElement).value)}
          ></ion-input>
          <ion-input
            type="number"
            step="0.01"
            placeholder="Precio"
            .value=${this.newPrice}
            @ionInput=${(e: Event) => (this.newPrice = (e.target as HTMLInputElement).value)}
          ></ion-input>
          <ion-button type="submit" size="small" ?disabled=${this.saving || !this.newName || !this.newSku}>
            ${this.saving ? 'Guardando…' : 'Añadir'}
          </ion-button>
        </form>

        ${this.formError ? html`<p class="err">${this.formError}</p>` : nothing}
        ${this.ctrl?.error ? html`<p class="err">${this.ctrl.error}</p>` : nothing}

        <ok-data-table
          .serverSide=${true}
          .columns=${this.columns}
          .rows=${this.ctrl?.rows ?? []}
          .total=${this.ctrl?.total ?? 0}
          .page=${this.ctrl?.state.page ?? 0}
          .pageSize=${this.ctrl?.state.pageSize ?? 50}
          .sort=${this.ctrl?.state.sort}
          .sortDir=${this.ctrl?.state.dir ?? 'asc'}
          .searchable=${true}
          .searchPlaceholder=${'Buscar nombre o SKU…'}
          .emptyMessage=${this.ctrl?.loading ? 'Cargando…' : 'Sin productos.'}
          @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)}
          @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) =>
            this.ctrl.setSort(e.detail.sort, e.detail.dir)}
          @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)}
          @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) =>
            this.ctrl.setFilter(e.detail.col, e.detail.value)}
        ></ok-data-table>
      </div>
    `;
  }
}

define('erp-inventory-products', ErpInventoryProducts);
