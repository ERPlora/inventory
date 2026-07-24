import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-data-table';
import '@erplora/outfitkit/ok-kpi';
import '@erplora/outfitkit/ok-inline-feedback';
import type { DataTableColumn } from '@erplora/outfitkit';
import { createListController, dataTableLabels } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';
import { formatQuantity } from '../../lib/quantity';

// Catálogo i18n del módulo (ADR-0055): esbuild inlinea estos JSON en el `dist` del WC.
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';
const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

// Vista "Dashboard" del módulo inventory (inventory#9): KPIs de existencias + valoración
// básica A COSTE + productos con stock bajo. El contrato de claves es el de `stats.sql`
// (products_tracked/in_stock/out_of_stock/low_stock/without_cost, total_inventory_value)
// — la UI NO renombra columnas. Dinero SIEMPRE con `formatMoney` (céntimos, ADR-0007).

interface ErploraClientLike extends ListClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  /** Moneda del hub + formateo de dinero (ADR-0059). `formatMoney` recibe CÉNTIMOS. */
  currency: string;
  formatMoney(cents: number, opts?: { currency?: string; locale?: string }): string;
  /** i18n del módulo (ADR-0055). */
  locale: string;
  t(catalog: Record<string, unknown>, key: string): string;
}

/** Contrato de `inventory.products.stats` (stats.sql) — claves = las del SQL. */
interface Stats {
  total_products: number;
  products_tracked: number;
  products_in_stock: number;
  products_out_of_stock: number;
  products_low_stock: number;
  products_without_cost: number;
  /** Céntimos, valoración a coste (Σ cost × stock de físicos con stock > 0). */
  total_inventory_value: number;
}

interface LowStockRow {
  id: string;
  name: string;
  sku: string;
  stock: number;
  low_stock_threshold: number;
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
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; margin: 0 0 1rem; }
    .cards a { text-decoration: none; color: inherit; display: block; }
    .section { margin-bottom: 1.5rem; }
    .state { color: var(--ion-color-medium, #6b6557); margin: 0 0 1rem; }
    ion-note { display: block; margin: 0 0 1rem; font-size: 0.85rem; }
  `;

  @state() private stats: Stats | null = null;
  @state() private statsLoading = true;
  @state() private statsError = false;
  private ctrl!: ListController<LowStockRow>;
  private readonly onLocaleChange = (): void => this.requestUpdate();

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
  }

  disconnectedCallback(): void {
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
    super.disconnectedCallback();
  }

  /** Columnas = las que `low_stock.sql` proyecta (nada de `price`: no viene, era NaN). */
  get columns(): DataTableColumn[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return [
      { key: 'name', header: t('ui.name') },
      { key: 'sku', header: t('ui.sku') },
      {
        key: 'stock',
        header: t('ui.stock'),
        align: 'right',
        format: (r) => formatQuantity(Number(r.stock)),
      },
      {
        key: 'low_stock_threshold',
        header: t('ui.threshold'),
        align: 'right',
        format: (r) => formatQuantity(Number(r.low_stock_threshold)),
      },
    ];
  }

  async firstUpdated(): Promise<void> {
    try {
      // `query()` devuelve FILAS: stats es una query de agregados → una única fila.
      const res = await erplora().query<unknown>('inventory.products.stats');
      const row = Array.isArray(res) ? res[0] : res;
      if (row && typeof row === 'object') {
        this.stats = row as Stats;
      } else {
        this.statsError = true;
      }
    } catch {
      this.statsError = true;
    } finally {
      this.statsLoading = false;
    }
    this.ctrl = createListController<LowStockRow>(erplora(), 'inventory.products.low_stock', () => this.requestUpdate(), {
      pageSize: 5,
    });
    await this.ctrl.load();
  }

  private kpis() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    const s = this.stats!;
    const n = (v: number | undefined): string => String(v ?? 0);
    // Las KPIs de existencias enlazan a la vista de productos del módulo (accionables).
    const productsHref = '/m/inventory/products';
    return html`
      <div class="cards">
        <a href=${productsHref}><ok-kpi label=${t('ui.statsTracked')} value=${n(s.products_tracked)} icon="cube-outline"></ok-kpi></a>
        <a href=${productsHref}><ok-kpi label=${t('ui.statsInStock')} value=${n(s.products_in_stock)} icon="checkmark-circle-outline"></ok-kpi></a>
        <a href=${productsHref}><ok-kpi label=${t('ui.statsOutOfStock')} value=${n(s.products_out_of_stock)} icon="close-circle-outline" trend=${s.products_out_of_stock > 0 ? 'down' : 'flat'}></ok-kpi></a>
        <a href=${productsHref}><ok-kpi label=${t('ui.statsLowStock')} value=${n(s.products_low_stock)} icon="warning-outline" trend=${s.products_low_stock > 0 ? 'down' : 'flat'}></ok-kpi></a>
        <ok-kpi label=${t('ui.statsValue')} value=${erplora().formatMoney(Number(s.total_inventory_value ?? 0))} icon="pricetag-outline" delta=${t('ui.statsValueAtCost')}></ok-kpi>
      </div>
      ${s.products_without_cost > 0
        ? html`<ion-note color="warning">${s.products_without_cost} ${t('ui.statsWithoutCost')}</ion-note>`
        : nothing}
    `;
  }

  render() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return html`
      <div>
        ${this.statsLoading ? html`<p class="state">${t('ui.loading')}</p>` : nothing}
        ${this.statsError ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${t('ui.statsError')}</ok-inline-feedback>` : nothing}
        ${this.stats ? this.kpis() : nothing}

        <div class="section">
          <h2>${t('ui.lowStockTitle')}</h2>
          ${this.ctrl?.error ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : nothing}
          <ok-data-table
            .serverSide=${true}
            .labels=${dataTableLabels(erplora().locale)}
            .columns=${this.columns}
            .views=${true}
            .cardTitle=${(row: Record<string, unknown>) => String(row.name ?? row.sku ?? '')}
            .rows=${this.ctrl?.rows ?? []}
            .total=${this.ctrl?.total ?? 0}
            .page=${this.ctrl?.state.page ?? 0}
            .pageSize=${this.ctrl?.state.pageSize ?? 5}
            .pageSizeOptions=${[]}
            .emptyMessage=${this.ctrl?.loading ? t('ui.loading') : t('ui.lowStockEmpty')}
            @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)}
          ></ok-data-table>
        </div>
      </div>
    `;
  }
}

define('erp-inventory-dashboard', ErpInventoryDashboard);
