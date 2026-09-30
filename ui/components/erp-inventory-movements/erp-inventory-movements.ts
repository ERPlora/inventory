import { LitElement, html, css, nothing } from 'lit';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-data-table';
import '@erplora/outfitkit/ok-inline-feedback';
import type { DataTableColumn } from '@erplora/outfitkit';
import { createListController, dataTableLabels, dataTableShowsLoadError } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';
import { formatQuantity, fromMicro } from '../../lib/quantity';

// Catálogo i18n del módulo (ADR-0055).
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';
const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

// Vista «Movimientos» (inventory#7): el libro INMUTABLE del stock — recepciones, ventas,
// anulaciones, recuentos — server-side sobre `inventory.stock.movements` (búsqueda por
// producto/sku/referencia + filtros por tipo y fecha). Solo lectura: los movimientos se
// crean desde los flujos (recepción/recuento en Productos, ventas del POS), nunca a mano.

interface ErploraClientLike extends ListClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  locale: string;
  t(catalog: Record<string, unknown>, key: string): string;
}

interface MovementRow {
  id: string;
  product_id: string;
  product_name: string | null;
  sku: string | null;
  movement_type: string;
  qty: number | string;
  stock_after: number | string;
  reason: string | null;
  reference: string | null;
  unit_cost: number | null;
  location_id: string;
  created_at: string;
}

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

/** Fecha legible en el locale activo (QA 07-16: el ISO crudo con offset no es para humanos). */
function formatDate(v: string, locale: string): string {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString(locale || 'es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Delta firmado: las entradas llevan `+` explícito; Postgres sirve NUMERIC como string. */
function formatQty(v: number | string): string {
  const logical = fromMicro(Number(v));
  return logical > 0 ? `+${logical}` : String(logical);
}

export class ErpInventoryMovements extends LitElement {
  static styles = css`
    :host { display:flex; flex-direction:column; height:100%; min-height:0; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    /* Estructura de la casa (services/staff/products): la vista llena el alto, la tabla scrollea dentro. */
    .page { display:flex; flex-direction:column; min-height:0; flex:1 1 auto; }
    .page > ok-data-table { flex:1 1 auto; min-height:0; }
  `;

  private ctrl!: ListController<MovementRow>;
  private readonly onLocaleChange = (): void => this.requestUpdate();

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
  }

  disconnectedCallback(): void {
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
    super.disconnectedCallback();
  }

  get columns(): DataTableColumn[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    const typeKey = (mt: string): string => {
      const map: Record<string, string> = {
        initial: 'ui.mvInitial', reception: 'ui.mvReception', sale: 'ui.mvSale',
        void: 'ui.mvVoid', count: 'ui.mvCount', decrease: 'ui.mvDecrease',
      };
      return map[mt] ?? mt;
    };
    return [
      { key: 'created_at', header: t('ui.mvDate'), sortable: true,
        format: (r) => formatDate(String((r as unknown as MovementRow).created_at), erplora().locale) },
      { key: 'product_name', header: t('ui.name') },
      { key: 'sku', header: t('ui.sku') },
      {
        key: 'movement_type', header: t('ui.mvType'), filterable: true, filterType: 'select',
        options: ['reception', 'sale', 'void', 'count', 'decrease', 'initial']
          .map((v) => ({ value: v, label: t(typeKey(v)) })),
        format: (r) => t(typeKey(String((r as unknown as MovementRow).movement_type))),
      },
      { key: 'qty', header: t('ui.mvQty'), align: 'right', sortable: true,
        format: (r) => formatQty((r as unknown as MovementRow).qty) },
      { key: 'stock_after', header: t('ui.mvStockAfter'), align: 'right', sortable: true,
        format: (r) => formatQuantity((r as unknown as MovementRow).stock_after) },
      { key: 'reason', header: t('ui.mvReason') },
      { key: 'reference', header: t('ui.mvReference'), filterable: true, filterType: 'text' },
    ];
  }

  async firstUpdated(): Promise<void> {
    this.ctrl = createListController<MovementRow>(erplora(), 'inventory.stock.movements', () => this.requestUpdate());
    await this.ctrl.load();
  }

  render() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return html`
      <div class="page">
      ${this.ctrl?.error && !dataTableShowsLoadError() ? html`<ok-inline-feedback data-testid="inventory-movements-load-error" tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : nothing}
      <ok-data-table
        testid="inventory-movements-table"
        .error=${this.ctrl?.error ?? ''}
        @retry=${() => this.ctrl?.load()}
        fill
        .serverSide=${true}
        .labels=${dataTableLabels(erplora().locale)}
        .searchable=${true}
        .views=${true}
        .cardTitle=${(row: Record<string, unknown>) => String(row.product_name ?? row.sku ?? '')}
        .columns=${this.columns}
        .rows=${this.ctrl?.rows ?? []}
        .total=${this.ctrl?.total ?? 0}
        .page=${this.ctrl?.state.page ?? 0}
        .pageSize=${this.ctrl?.state.pageSize ?? 50}
        .emptyMessage=${this.ctrl?.loading ? t('ui.loading') : t('ui.mvEmpty')}
        @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)}
        @pageSizeChange=${(e: CustomEvent<number>) => this.ctrl.setPageSize(e.detail)}
        @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)}
        @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) =>
          this.ctrl.setSort(e.detail.sort, e.detail.dir)}
        @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) =>
          this.ctrl.setFilter(e.detail.col, e.detail.value)}
      ></ok-data-table>
      </div>
    `;
  }
}

define('erp-inventory-movements', ErpInventoryMovements);
