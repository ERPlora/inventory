import { LitElement, html, css, nothing } from 'lit';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn } from '@erplora/outfitkit';
import { createListController } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';

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

/** Delta firmado: las entradas llevan `+` explícito; Postgres sirve NUMERIC como string. */
function formatQty(v: number | string): string {
  const n = Number(v);
  return n > 0 ? `+${n}` : String(n);
}

export class ErpInventoryMovements extends LitElement {
  static styles = css`
    :host { display: block; height: 100%; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
  `;

  private ctrl!: ListController<MovementRow>;

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
      { key: 'created_at', header: t('ui.mvDate'), sortable: true },
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
        format: (r) => String(Number((r as unknown as MovementRow).stock_after)) },
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
      ${this.ctrl?.error ? html`<p>${this.ctrl.error}</p>` : nothing}
      <ok-data-table
        fill
        .serverSide=${true}
        .searchable=${true}
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
    `;
  }
}

define('erp-inventory-movements', ErpInventoryMovements);
