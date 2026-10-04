import { LitElement, html, css, nothing } from 'lit';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-data-table';
import '@erplora/outfitkit/ok-inline-feedback';
import type { DataTableColumn } from '@erplora/outfitkit';
import { createListController, dataTableLabels, dataTableShowsLoadError } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';
import { formatQuantity, fromMicro } from '../../lib/quantity';
import { formatListDateTime, splitListDateTime } from '../../lib/list-date';
import {
  movementReference, resolveSaleDocument, saleReferenceOf, withDocumentNumberSearch, type SaleDocument,
} from '../../lib/movement-reference';

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
  queryOptional<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T | undefined>;
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
  /** The document each sale on screen produced, by sale id (inventory#137): `null` while being
   *  resolved or when none could be. Asked once per sale for the life of the view. */
  private readonly saleDocuments = new Map<string, SaleDocument | null>();
  /** Movement ids whose Reference a tap unfolded (inventory#144); a new page folds them again. */
  private readonly unfoldedReferences = new Set<string>();
  private lastPointerType = '';
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
    // Widths measured on the hub:dev bench (inventory#130, #139): the floors add up to 660 px (the
    // data columns get 664 at 1024x768 with the side menu open, 700 at 820x1180), so on a tablet
    // the date holds 108 px (an older movement in Spanish, «29/08/29, 20:59», is 107) and the name
    // keeps 160, and the name takes most of the leftover on a wider screen. The reference grows a
    // little faster (still at its floor on a tablet) so a delivery note number fits on a desktop.
    // Type, quantity and balance paint a word or a short number and do not grow.
    return [
      { key: 'created_at', header: t('ui.mvDate'), sortable: true, width: 'minmax(6.75rem,0.9fr)',
        format: (r) => formatListDateTime((r as unknown as MovementRow).created_at, erplora().locale),
        render: (r) => this.dateCell(r as unknown as MovementRow) },
      { key: 'product_name', header: t('ui.name'), width: 'minmax(7.5rem,3.1fr)' },
      { key: 'sku', header: t('ui.sku'), width: 'minmax(4.5rem,0.8fr)' },
      {
        key: 'movement_type', header: t('ui.mvType'), filterable: true, filterType: 'select', width: '4.5rem',
        options: ['reception', 'sale', 'void', 'count', 'decrease', 'initial']
          .map((v) => ({ value: v, label: t(typeKey(v)) })),
        format: (r) => t(typeKey(String((r as unknown as MovementRow).movement_type))),
      },
      { key: 'qty', header: t('ui.mvQty'), align: 'right', sortable: true, width: '5.25rem',
        format: (r) => formatQty((r as unknown as MovementRow).qty) },
      { key: 'stock_after', header: t('ui.mvStockAfter'), align: 'right', sortable: true, width: '4.75rem',
        format: (r) => formatQuantity((r as unknown as MovementRow).stock_after) },
      { key: 'reason', header: t('ui.mvReason'), width: 'minmax(3.25rem,1fr)' },
      { key: 'reference', header: t('ui.mvReference'), filterable: true, filterType: 'text', width: 'minmax(4.75rem,1.25fr)',
        format: (r) => this.referenceText(r as unknown as MovementRow),
        render: (r) => this.referenceCell(r as unknown as MovementRow) },
    ];
  }

  /**
   * inventory#139: an older movement in English, «12/31/25, 11:45 PM», is wider than the tablet
   * column (108 px), and ok-data-table makes a cell one clipped line, so it read «12/31/25, 11:…».
   * The date and the time are painted as pieces that never break inside, and the time drops under
   * the date when both do not fit — that row is a line taller, but nothing is cut.
   */
  private dateCell(row: MovementRow): unknown {
    const locale = erplora().locale;
    const text = formatListDateTime(row.created_at, locale);
    const parts = splitListDateTime(row.created_at, locale);
    if (!parts) return text;
    return html`<span data-testid="inventory-movements-date" title=${text} style="white-space:normal"
      ><span style="white-space:nowrap">${parts.date}${parts.separator.trimEnd()}</span> <span
      style="white-space:nowrap">${parts.time}</span></span>`;
  }

  private referenceText(row: MovementRow): string {
    return movementReference(row, this.saleDocuments.get(saleReferenceOf(row)));
  }

  /**
   * inventory#144: a document number tells itself from its neighbours by its END — a ticket starts
   * with the date («20261004-0001»), a delivery note with its series («ALB-2026-000123») — and on a
   * tablet the column (76 px) holds about seven of its characters. So the cell clips at its START
   * («…04-0001»): `dir="rtl"` moves the overflow and its ellipsis to the left, and the `<bdi>`
   * keeps the number itself reading left to right. The rest is ok-data-table's text cell (#217):
   * the whole number as the title, and a tap on a clipped number unfolds it in place.
   */
  private referenceCell(row: MovementRow): unknown {
    const text = this.referenceText(row);
    if (!text) return nothing;
    const unfolded = this.unfoldedReferences.has(row.id);
    return html`<span
      data-testid="inventory-movements-reference"
      class=${unfolded ? 'unfolded' : nothing}
      dir=${unfolded ? nothing : 'rtl'}
      title=${text}
      @pointerdown=${(e: PointerEvent) => { this.lastPointerType = e.pointerType; }}
      @click=${(e: MouseEvent) => this.unfoldReference(e, row.id)}
    ><bdi dir="ltr">${text}</bdi></span>`;
  }

  /** Same rule as ok-data-table (#217): a mouse has the title on hover, so only a touch unfolds,
   *  and only a number that is actually clipped. */
  private unfoldReference(e: MouseEvent, id: string): void {
    if (this.lastPointerType !== 'touch') return;
    const span = e.currentTarget as HTMLElement;
    if (span.scrollWidth <= span.clientWidth) return;
    this.unfoldedReferences.add(id);
    this.requestUpdate();
  }

  protected updated(): void {
    this.resolveDocuments();
  }

  /** Ask, once per sale, which document the sales on the current page produced (inventory#137). */
  private resolveDocuments(): void {
    for (const row of this.ctrl?.rows ?? []) {
      const saleId = saleReferenceOf(row);
      if (!saleId || this.saleDocuments.has(saleId)) continue;
      this.saleDocuments.set(saleId, null);
      void resolveSaleDocument(erplora(), saleId).then((doc) => {
        this.saleDocuments.set(saleId, doc);
        if (doc) this.requestUpdate();
      });
    }
  }

  /** A search or a filter is on: an empty page means «nothing matches», not «no movements yet». */
  private get hasQuery(): boolean {
    const s = this.ctrl?.state;
    return !!s && (s.search.trim() !== '' || Object.keys(s.filters).length > 0);
  }

  async firstUpdated(): Promise<void> {
    // inventory#142: a typed ticket/invoice/sale number is searched as the sale it names.
    this.ctrl = createListController<MovementRow>(
      withDocumentNumberSearch(erplora()), 'inventory.stock.movements', () => {
        this.unfoldedReferences.clear();
        this.requestUpdate();
      },
    );
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
        .emptyMessage=${this.ctrl?.loading ? t('ui.loading') : t(this.hasQuery ? 'ui.mvNoMatch' : 'ui.mvEmpty')}
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
