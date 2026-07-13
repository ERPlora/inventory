import { LitElement, html, css, nothing, svg } from 'lit';
import { state } from 'lit/decorators.js';
import { code128b } from '../../lib/code128';
// `define` por su subpath ligero: importar el barrel '@erplora/outfitkit' arrastraría (efectos
// secundarios) el registro de TODOS los ok-* al bundle del módulo. `ok-data-table` se importa por
// su efecto secundario (se auto-registra). Tipos desde el barrel (se borran en build).
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn, DataTableAction } from '@erplora/outfitkit';
// La frontera EUROS ↔ CÉNTIMOS vive en el SDK (ADR-0123), no copiada en cada WC: tenerla copiada es
// lo que hizo que el import CSV se olvidara del ×100 y guardara un café de 2,20 € como un producto
// de 2 CÉNTIMOS. Su gemelo Rust es `guest_sdk::money::euros_to_cents`.
import { createListController, eurosToCents, centsToEuros } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';
// Catálogo i18n del módulo (ADR-0055): esbuild inlinea estos JSON en el `dist` del WC. Los textos
// internos se resuelven con `erplora.t(CATALOG, 'ui.clave')` (idioma activo, fallback locale→en→clave).
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';
const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

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
  /** i18n del módulo (ADR-0055): idioma activo + traducción del catálogo `ui`. */
  locale: string;
  t(catalog: Record<string, unknown>, key: string, params?: Record<string, unknown>): string;
  /** Moneda del hub + formateo de dinero (ADR-0059). */
  currency: string;
  formatAmount(units: number, opts?: { currency?: string; locale?: string }): string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  low_stock_threshold: number;
  is_active: number;
}


function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

export class ErpInventoryProducts extends LitElement {
  static styles = css`
    :host { display:flex; flex-direction:column; height:100%; min-height:0; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    /* La vista llena el alto: el data-table ocupa todo (scroll interno, footer fijo). */
    .page { display:flex; flex-direction:column; min-height:0; flex:1 1 auto; }
    .page > ok-data-table { flex:1 1 auto; min-height:0; }
    .form { display:flex; flex-direction:column; gap:.7rem; }
    .form ion-button { align-self:flex-end; }
    .err { color:#d9480f; font-weight:600; }
    /* Detalle de producto */
    .detail { display:flex; flex-direction:column; gap:.6rem; }
    .drow { display:flex; justify-content:space-between; border-bottom:1px solid var(--ion-border-color,#eee); padding:.4rem 0; }
    .drow span { color:var(--ion-color-medium,#6b6557); }
    .barcode { text-align:center; margin:1rem 0; padding:1rem; border:1px solid var(--ion-border-color,#e6e2d8); border-radius:10px; }
    .barcode .bc { max-width:100%; height:auto; }
    .bccode { font:14px ui-monospace,monospace; margin-top:.4rem; letter-spacing:.08em; }
  `;

  @state() private newName = '';
  @state() private newSku = '';
  @state() private newPrice = '';
  @state() private saving = false;
  @state() private formError = '';

  private ctrl!: ListController<Product>;
  private unsub?: () => void;

  // Getter (no campo): se re-evalúa en cada render, así los textos cambian con el idioma activo
  // (ADR-0055). `connectedCallback` re-renderiza al recibir `erplora:locale-changed`.
  private get columns(): DataTableColumn[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return [
    { key: 'name', header: t('ui.name'), sortable: true, filterable: true, filterType: 'text' },
    { key: 'sku', header: t('ui.sku'), sortable: true, filterable: true, filterType: 'text' },
    {
      key: 'price',
      header: t('ui.price'),
      align: 'right',
      sortable: true,
      filterable: true,
      filterType: 'range',
      // El precio está en CÉNTIMOS → `formatMoney` (divide). `formatAmount` NO divide: con él,
      // un café de 220 céntimos se pintaba «220,00 €».
      format: (r) => erplora().formatMoney(Number(r.price)),
    },
    { key: 'stock', header: t('ui.stock'), align: 'right', sortable: true, filterable: true, filterType: 'range' },
    {
      key: 'is_active',
      header: t('ui.active'),
      align: 'center',
      filterable: true,
      filterType: 'select',
      options: [
        { value: '1', label: t('ui.yes') },
        { value: '0', label: t('ui.no') },
      ],
      // Celda interactiva: ion-toggle (verde = activo). Al cambiar, persiste vía command.
      // El color va por CSS var (--background-checked) y no por `color=`, porque las clases
      // .ion-color-* no penetran el shadow DOM de ok-data-table; las custom props sí heredan.
      render: (r) => html`
        <ion-toggle
          style="--track-background-checked: rgba(var(--ion-color-success-rgb, 45,211,111), 0.5); --handle-background-checked: var(--ion-color-success, #2dd36f);"
          ?checked=${!!r.is_active}
          @ionChange=${(e: Event) => this.toggleActive(r as unknown as Product, e)}
        ></ion-toggle>
      `,
    },
    ];
  }

  @state() private detail: Product | null = null;

  // Acciones por fila (botones) → la tabla emite `rowAction` con { actionId, row }. Getter (i18n).
  private get actions(): DataTableAction[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return [
      { id: 'detail', label: t('ui.actionDetail'), icon: 'eye-outline' },
      { id: 'edit', label: t('ui.actionEdit'), icon: 'create-outline' },
      { id: 'delete', label: t('ui.actionDelete'), icon: 'trash-outline', color: 'danger' },
    ];
  }

  private async onRowAction(ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>): Promise<void> {
    const { actionId, row } = ev.detail;
    const p = row as unknown as Product;
    if (actionId === 'detail') {
      this.detail = p; // abre el modal de detalle (con código de barras)
    } else if (actionId === 'edit') {
      this.newName = p.name;
      this.newSku = p.sku;
      this.newPrice = centsToEuros(p.price); // la fila viene en céntimos; el form edita EUROS
      this.dataTable()?.open('create'); // abre el panel lateral con el form pre-rellenado
    } else if (actionId === 'delete') {
      try {
        await erplora().command('inventory.products.delete', { product_id: p.id });
        await this.ctrl.load();
      } catch (e) {
        this.formError = e instanceof Error ? e.message : 'No se pudo eliminar';
      }
    }
  }

  private async toggleActive(p: Product, ev: Event): Promise<void> {
    const checked = (ev.target as HTMLInputElement).checked;
    try {
      // El command exige el conjunto completo de campos editables (schemas/product_update.json):
      // se reenvían los valores actuales de la fila y solo cambia is_active.
      await erplora().command('inventory.products.update', {
        product_id: p.id,
        name: p.name,
        price: p.price,
        cost: p.cost ?? 0,
        low_stock_threshold: p.low_stock_threshold ?? 10,
        is_active: checked ? 1 : 0,
      });
      await this.ctrl.load();
    } catch (e) {
      this.formError = e instanceof Error ? e.message : 'No se pudo actualizar';
    }
  }

  // Referencia al ok-data-table para abrir/cerrar su panel lateral (drawer).
  private dataTable(): { open(p?: 'filters' | 'create'): void; close(): void } | null {
    return this.renderRoot.querySelector('ok-data-table') as
      | { open(p?: 'filters' | 'create'): void; close(): void }
      | null;
  }

  // Importa productos desde CSV (cabeceras = name, sku, price, stock…). Crea uno por fila.
  private async onCsvImport(ev: CustomEvent<{ rows: Record<string, string>[] }>): Promise<void> {
    const rows = ev.detail.rows ?? [];
    for (const r of rows) {
      if (!r.name && !r.sku) continue;
      try {
        await erplora().command('inventory.products.create', {
          name: r.name ?? '',
          sku: r.sku ?? '',
          price: eurosToCents(r.price),
          stock: Number(r.stock) || 0,
          cost: eurosToCents(r.cost),
          low_stock_threshold: Number(r.low_stock_threshold) || 10,
          product_type: 'physical',
          ean13: r.ean13 || null,
          description: r.description ?? '',
          tax_class_id: null,
          image: '',
        });
      } catch {
        /* ignora filas inválidas */
      }
    }
    await this.ctrl.load();
  }

  // Código de barras Code128 (SVG) del SKU.
  private renderBarcode(text: string) {
    const bc = code128b(text, 2, 70);
    return html`<svg class="bc" width=${bc.width} height=${bc.height} viewBox="0 0 ${bc.width} ${bc.height}" fill="#000">
      ${bc.bars.map((b) => svg`<rect x=${b.x} y="0" width=${b.w} height=${bc.height}></rect>`)}
    </svg>`;
  }
  // Imprime el código de barras en una ventana aparte (en el Hub real iría al Bridge/etiquetadora).
  private printBarcode(p: Product): void {
    const bc = code128b(p.sku, 2, 90);
    const rects = bc.bars.map((b) => `<rect x="${b.x}" y="0" width="${b.w}" height="${bc.height}"/>`).join('');
    const win = window.open('', '_blank', 'width=420,height=320');
    if (!win) return;
    win.document.write(
      `<!doctype html><meta charset="utf-8"><title>${p.sku}</title>` +
        `<body style="margin:0;display:grid;place-items:center;height:100vh;font-family:system-ui">` +
        `<div style="text-align:center"><svg width="${bc.width}" height="${bc.height}" viewBox="0 0 ${bc.width} ${bc.height}" fill="#000">${rects}</svg>` +
        `<div style="font:14px monospace;margin-top:6px">${p.sku}</div>` +
        `<div style="font:13px system-ui;color:#555">${p.name}</div></div>` +
        `<script>window.onload=function(){window.print()}<\/script>`,
    );
    win.document.close();
  }

  // Init una sola vez tras el primer render (equivalente a `componentWillLoad` de Stencil: el shell
  // crea una instancia nueva del WC en cada montaje de la vista). El re-render lo dispara el
  // controlador vía `requestUpdate()` (sustituye al antiguo `this.tick++`), no un @state.
  // Re-render al cambiar el idioma del shell (ADR-0055): los getters `columns`/`actions` y el
  // texto del template se re-evalúan con el nuevo `erplora.locale`.
  private readonly onLocaleChange = (): void => this.requestUpdate();
  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
  }

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
      const reload = () => this.ctrl.load();
      const off1 = erplora().on('inventory.stock_changed', reload);
      const off2 = erplora().on('inventory.product.created', reload);
      this.unsub = () => {
        off1();
        off2();
      };
    } catch {
      /* sin SDK (preview) → sin reactividad en vivo */
    }
  }

  disconnectedCallback(): void {
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
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
        // El input es EUROS (`step="0.01"`); la columna es INTEGER de céntimos (ADR-0007).
        // Sin esta frontera, teclear «2,20» guardaba 2 céntimos.
        price: eurosToCents(this.newPrice),
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
      this.dataTable()?.close(); // cierra el panel lateral tras crear
      await this.ctrl.load(); // refresco inmediato (además del evento)
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
          .csvName=${'inventory-products.csv'}
          @csvImport=${(e: CustomEvent<{ rows: Record<string, string>[] }>) => this.onCsvImport(e)}
          @rowAction=${(e: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => this.onRowAction(e)}
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
          @pageSizeChange=${(e: CustomEvent<number>) => this.ctrl.setPageSize(e.detail)}
          @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) =>
            this.ctrl.setSort(e.detail.sort, e.detail.dir)}
          @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)}
          @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) =>
            this.ctrl.setFilter(e.detail.col, e.detail.value)}
        >
          <!-- Formulario de alta: el botón "+" del data-table despliega este acordeón. -->
          <form slot="create" class="form" @submit=${(e: Event) => this.createProduct(e)}>
            <ion-input
              fill="outline"
              label="Nombre"
              label-placement="floating"
              .value=${this.newName}
              @ionInput=${(e: Event) => (this.newName = (e.target as HTMLInputElement).value)}
            ></ion-input>
            <ion-input
              fill="outline"
              label="SKU"
              label-placement="floating"
              .value=${this.newSku}
              @ionInput=${(e: Event) => (this.newSku = (e.target as HTMLInputElement).value)}
            ></ion-input>
            <ion-input
              fill="outline"
              label="Precio"
              label-placement="floating"
              type="number"
              step="0.01"
              .value=${this.newPrice}
              @ionInput=${(e: Event) => (this.newPrice = (e.target as HTMLInputElement).value)}
            ></ion-input>
            <ion-button type="submit" ?disabled=${this.saving || !this.newName || !this.newSku}>
              ${this.saving ? 'Guardando…' : 'Guardar'}
            </ion-button>
          </form>
        </ok-data-table>

        <ion-modal .isOpen=${!!this.detail} @ionModalDidDismiss=${() => (this.detail = null)}>
          <ion-header class="ion-no-border">
            <ion-toolbar>
              <ion-title>${this.detail?.name ?? ''}</ion-title>
              <ion-buttons slot="end">
                <ion-button @click=${() => (this.detail = null)}><ion-icon name="close" slot="icon-only"></ion-icon></ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            ${this.detail
              ? html`
                  <div class="detail">
                    <div class="drow"><span>SKU</span><b>${this.detail.sku}</b></div>
                    <div class="drow"><span>Precio</span><b>${erplora().formatAmount(Number(this.detail.price))}</b></div>
                    <div class="drow"><span>Stock</span><b>${this.detail.stock}</b></div>
                    <div class="drow"><span>Activo</span><b>${this.detail.is_active ? 'Sí' : 'No'}</b></div>
                    <div class="barcode">
                      ${this.renderBarcode(this.detail.sku)}
                      <div class="bccode">${this.detail.sku}</div>
                    </div>
                    <ion-button expand="block" @click=${() => this.detail && this.printBarcode(this.detail)}>
                      <ion-icon name="print-outline" slot="start"></ion-icon> Imprimir código de barras
                    </ion-button>
                  </div>
                `
              : nothing}
          </ion-content>
        </ion-modal>
      </div>
    `;
  }
}

define('erp-inventory-products', ErpInventoryProducts);
