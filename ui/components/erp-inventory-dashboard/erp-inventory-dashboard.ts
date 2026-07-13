import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn } from '@erplora/outfitkit';
import { createListController } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';

// Vista "Dashboard" del módulo inventory: informe principal (KPIs + productos con stock bajo).
// Patrón de referencia: todos los módulos tienen un dashboard como primera pestaña.

interface ErploraClientLike extends ListClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  /** Moneda del hub + formateo de dinero (ADR-0059). */
  currency: string;
  formatAmount(units: number, opts?: { currency?: string; locale?: string }): string;
}

interface Stats {
  total_products?: number;
  active_products?: number;
  low_stock?: number;
  total_value?: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
  price: number;
}

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

export class ErpInventoryDashboard extends LitElement {
  static styles = css`
    :host { display: block; height: 100%; overflow: auto; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    h2 { font-size: 1rem; margin: 0 0 0.75rem; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; margin: 0 0 1.5rem; }
    .kpi { background: var(--ion-card-background, #fff); border: 1px solid var(--ion-border-color, #e6e2d8); border-radius: 12px; padding: 0.85rem 1rem; }
    .kpi .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ion-color-medium, #6b6557); }
    .kpi .value { font-size: 1.5rem; font-weight: 700; margin-top: 0.2rem; }
    .kpi.warn .value { color: #d9700f; }
    .section { margin-bottom: 1.5rem; }
  `;

  @state() private stats: Stats = {};
  private ctrl!: ListController<Product>;

  private columns: DataTableColumn[] = [
    { key: 'name', header: 'Nombre' },
    { key: 'sku', header: 'SKU' },
    { key: 'stock', header: 'Stock', align: 'right' },
    { key: 'price', header: 'Precio', align: 'right', format: (r) => Number(r.price).toFixed(2) },
  ];

  async firstUpdated(): Promise<void> {
    try {
      this.stats = (await erplora().query<Stats>('inventory.products.stats')) ?? {};
    } catch {
      this.stats = {};
    }
    this.ctrl = createListController<Product>(erplora(), 'inventory.products.low_stock', () => this.requestUpdate(), {
      pageSize: 5,
    });
    await this.ctrl.load();
  }

  render() {
    return html`
      <div>
        <div class="cards">
          <div class="kpi">
            <div class="label">Productos</div>
            <div class="value">${this.stats.total_products ?? '—'}</div>
          </div>
          <div class="kpi">
            <div class="label">Activos</div>
            <div class="value">${this.stats.active_products ?? '—'}</div>
          </div>
          <div class="kpi ${this.stats.low_stock ? 'warn' : ''}">
            <div class="label">Stock bajo</div>
            <div class="value">${this.stats.low_stock ?? '—'}</div>
          </div>
          <div class="kpi">
            <div class="label">Valor inventario</div>
            <div class="value">${this.stats.total_value != null ? erplora().formatAmount(Number(this.stats.total_value)) : '—'}</div>
          </div>
        </div>

        <div class="section">
          <h2>Productos con stock bajo</h2>
          ${this.ctrl?.error ? html`<p>${this.ctrl.error}</p>` : nothing}
          <ok-data-table
            .serverSide=${true}
            .columns=${this.columns}
            .rows=${this.ctrl?.rows ?? []}
            .total=${this.ctrl?.total ?? 0}
            .page=${this.ctrl?.state.page ?? 0}
            .pageSize=${this.ctrl?.state.pageSize ?? 5}
            .pageSizeOptions=${[]}
            .emptyMessage=${this.ctrl?.loading ? 'Cargando…' : 'Sin productos en stock bajo.'}
            @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)}
          ></ok-data-table>
        </div>
      </div>
    `;
  }
}

define('erp-inventory-dashboard', ErpInventoryDashboard);
