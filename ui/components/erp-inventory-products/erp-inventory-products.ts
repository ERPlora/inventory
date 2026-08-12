import { LitElement, html, css, nothing, svg } from 'lit';
import { state } from 'lit/decorators.js';
import { code128b } from '../../lib/code128';
import { printBarcodeLabel } from '../../lib/barcode-print';
import { formatQuantity, fromMicro, onGrid, parseQuantity } from '../../lib/quantity';
import { resolveTaxCategories, pickTaxValue, normalizeAlias, learnAlias, createCategoryWithAlias } from '../../lib/tax-resolve';
// `define` por su subpath ligero: importar el barrel '@erplora/outfitkit' arrastraría (efectos
// secundarios) el registro de TODOS los ok-* al bundle del módulo. `ok-data-table` se importa por
// su efecto secundario (se auto-registra). Tipos desde el barrel (se borran en build).
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-inline-feedback';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn, DataTableAction } from '@erplora/outfitkit';
// La frontera EUROS ↔ CÉNTIMOS vive en el SDK (ADR-0123), no copiada en cada WC: tenerla copiada es
// lo que hizo que el import CSV se olvidara del ×100 y guardara un café de 2,20 € como un producto
// de 2 CÉNTIMOS. Su gemelo Rust es `guest_sdk::money::euros_to_cents`.
import { createListController, dataTableLabels, eurosToCents, centsToEuros } from '@erplora/module-sdk';
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
  /** TODAS las filas, sin tope (salvo que pases `limit`). Para lo que no es «una página»: la
   *  rejilla de productos del TPV, un `<ion-select>` de categorías fiscales, el mapa
   *  producto↔categoría. El viejo `page_size` NO era un parámetro del runtime: truncaba a 50. */
  queryAll<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T[]>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
  hasPermission?(permission: string): boolean;
  /** i18n del módulo (ADR-0055): idioma activo + traducción del catálogo `ui`. */
  locale: string;
  t(catalog: Record<string, unknown>, key: string, params?: Record<string, unknown>): string;
  /** Moneda del hub + formateo de dinero (ADR-0059). `formatMoney` recibe CÉNTIMOS y divide;
   *  `formatAmount` recibe unidades enteras (euros) y NO divide. Precios de BD = céntimos
   *  (ADR-0007) → SIEMPRE `formatMoney`. */
  currency: string;
  formatMoney(cents: number, opts?: { currency?: string; locale?: string }): string;
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
  unit_code?: string;
  tax_category_key: string | null;
  is_active: number;
  /** 1 = the product still has no fiscal category (projected by `queries/products_list.sql`). */
  needs_tax_setup?: number;
}

/** Value of the status filter that means «the product does not know how it is taxed» (inventory#38). */
const STATUS_UNCONFIGURED = 'unconfigured';

/**
 * Row status for the list: the two lifecycle states of always PLUS a third one, «not configured»
 * (inventory#38). A product created before the fiscal category became mandatory does not know
 * whether it is 21%, 10% or exempt; painting it as «active» is a lie the cashier pays for at the
 * till. Those products are not migrated (assigning them a default category would be making up
 * fiscal data): they are shown, with the reason, and can be filtered to be reviewed in one go.
 */
function statusOf(row: Record<string, unknown>): 'active' | 'inactive' | typeof STATUS_UNCONFIGURED {
  const key = row.tax_category_key;
  // The empty string is the same hole as NULL — mirrors the CASE in `products_list.sql`.
  if (key == null || String(key).trim() === '') return STATUS_UNCONFIGURED;
  // `Number(...)`: un adaptador que devuelva `is_active` como texto mandaría un `'0'` TRUTHY, y un
  // producto desactivado se pintaría activo.
  return Number(row.is_active) ? 'active' : 'inactive';
}

// Fila de `taxes.categories.list` (la CATEGORÍA fiscal es lo enlazable, ADR-0085). El selector del
// formulario y el modal del importador eligen una `key` canónica; el % lo resuelve `taxes` por país.
interface TaxCategory {
  id: string;
  key: string;
  name: string;
  is_system?: number;
}

// Fila de `inventory.units.list` (registro de unidades, ADR-0147). El selector de la ficha
// solo necesita el código y los nombres; factor/incremento los valida Rust.
interface Unit {
  id: string;
  code: string;
  name: string;
  name_es: string;
  increment_value?: number;
}


function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

/** Visibilidad de UI; el runtime vuelve a validar el permiso en cada command. */
function can(permission: string): boolean {
  const client = erplora();
  return typeof client.hasPermission === 'function' ? client.hasPermission(permission) : true;
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
    /* Sin reglas .barcode/.bc/.bccode a propósito (inventory#45): el código de barras vive dentro
       del ion-modal del detalle, que Ionic REPARENTA a body, así que esas reglas del shadow no le
       llegarían nunca. La placa se estila INLINE donde se pinta. */
  `;

  @state() newName = '';
  @state() newSku = '';
  @state() newPrice = '';
  @state() private newTaxCategoryKey = ''; // '' = sin categoría (se envía null)
  // Ficha completa (inventory#8): el form de alta/edición cubre TODOS los campos del dominio.
  @state() newCost = '';
  @state() newStock = '';
  @state() newThreshold = '';
  @state() newEan = '';
  @state() newDescription = '';
  @state() newType: 'physical' | 'service' = 'physical';
  @state() newActive = true;
  // Unidad maestra de inventario (ADR-0147): default 'ud' (la unidad suelta). Se envía SIEMPRE
  // (create y update): tras el COALESCE del comando, reenviar la actual es idempotente.
  @state() newUnitCode = 'ud';
  @state() private units: Unit[] = [];
  // Edición REAL (inventory#8): id en edición (null = alta). Estado técnico Y visible
  // (el form cambia de título/botón). El submit decide create vs update por esto.
  @state() editingId: string | null = null;
  // Categorías del producto (M2M): marcadas en el form; initial = las de BD al abrir la
  // edición, para sincronizar solo las diferencias (add/remove).
  @state() selectedCategoryIds: Set<string> = new Set();
  initialCategoryIds: Set<string> = new Set();
  @state() private productCategories: { id: string; name: string }[] = [];
  @state() private taxCategories: TaxCategory[] = [];
  @state() private saving = false;
  @state() private formError = '';

  // ── Importador CSV: resolución interactiva de categorías no reconocidas (ADR-0085) ──
  // Cuando el CSV trae un texto de categoría que no resuelve por alias/categoría, en vez de dejar
  // la fila sin categoría, se abre un modal para que el usuario decida (elegir existente / crear
  // nueva); la decisión se persiste como alias (`taxes.aliases.create` / `taxes.categories.create`)
  // para que la próxima importación resuelva sola.
  @state() private importOpen = false;
  @state() private importRows: Record<string, string>[] = []; // filas pendientes de crear
  @state() private importMap: Map<string, string> = new Map(); // textoNormalizado → key (ya resuelto)
  @state() private importUnresolved: string[] = []; // textos a decidir
  // Decisión por texto: 'skip' (sin categoría), 'pick' (key existente), 'create' (nueva key+name).
  @state() private importChoice: Record<string, { mode: 'skip' | 'pick' | 'create'; key: string; newKey: string; newName: string }> = {};
  // Borrado con confirmación (P1 QA beauty #6, paridad con categorías): nunca directo.
  @state() deleteTarget: Product | null = null;
  // Informe del import (inventory#13): visible al terminar, copiable; null = sin import reciente.
  @state() importReport: { total: number; created: number; skipped: number;
    failed: { line: number; sku: string; reason: string }[] } | null = null;

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
    {
      key: 'stock',
      header: t('ui.stock'),
      align: 'right',
      sortable: true,
      filterable: true,
      filterType: 'range',
      format: (r) => formatQuantity(Number(r.stock)),
    },
    {
      key: 'is_active',
      header: t('ui.status'),
      align: 'center',
      filterable: true,
      filterType: 'select',
      // TRES estados, no dos (inventory#38). El tercero no es una columna aparte a propósito: si
      // «sin configurar» viviera al lado del toggle, un producto que no se puede vender seguiría
      // pintándose «activo» — que es exactamente la mentira que costaba una venta en el mostrador.
      options: [
        { value: '1', label: t('ui.yes') },
        { value: '0', label: t('ui.no') },
        { value: STATUS_UNCONFIGURED, label: t('ui.statusUnconfigured') },
      ],
      render: (r) => {
        if (statusOf(r) === STATUS_UNCONFIGURED) return this.renderUnconfigured(r);
        // Celda interactiva: ion-toggle (verde = activo). Al cambiar, persiste vía command.
        // El color va por CSS var (--background-checked) y no por `color=`, porque las clases
        // .ion-color-* no penetran el shadow DOM de ok-data-table; las custom props sí heredan.
        return can('inventory.change_product')
          ? html`
              <ion-toggle
                aria-label=${t('ui.active')}
                style="--track-background-checked: rgba(var(--ion-color-success-rgb, 45,211,111), 0.5); --handle-background-checked: var(--ion-color-success, #2dd36f);"
                ?checked=${!!r.is_active}
                @ionChange=${(e: Event) => this.toggleActive(r as unknown as Product, e)}
              ></ion-toggle>
            `
          : (r.is_active ? t('ui.yes') : t('ui.no'));
      },
    },
    ];
  }

  /**
   * Estado de la fila para la columna de estado, ya traducido. Público (y puro) para que el
   * contrato del TERCER estado se pueda fijar en un test sin renderizar la tabla entera.
   */
  productStatus(row: Record<string, unknown>): { id: string; label: string; reason: string } {
    const t = (k: string): string => erplora().t(CATALOG, k);
    const id = statusOf(row);
    if (id === STATUS_UNCONFIGURED) {
      return { id, label: t('ui.statusUnconfigured'), reason: t('ui.statusUnconfiguredReason') };
    }
    return { id, label: id === 'active' ? t('ui.yes') : t('ui.no'), reason: '' };
  }

  /** Celda del tercer estado: DICE el motivo y, con permiso, es el atajo para arreglarlo. */
  private renderUnconfigured(row: Record<string, unknown>) {
    const { label, reason } = this.productStatus(row);
    const editable = can('inventory.change_product');
    return html`
      <ion-chip
        color="warning"
        title=${reason}
        ?disabled=${!editable}
        style=${editable ? 'cursor:pointer;' : ''}
        @click=${() => editable && this.onRowAction(
          new CustomEvent('rowAction', { detail: { actionId: 'edit', row } }),
        )}
      >
        <ion-icon name="alert-circle-outline"></ion-icon>
        <ion-label>${label} · ${reason}</ion-label>
      </ion-chip>
    `;
  }

  /**
   * Filtro de estado: los TRES valores son EXCLUYENTES entre sí, pero viajan al servidor por DOS
   * columnas distintas (`is_active` y `needs_tax_setup`), así que se aplican juntos y con UNA sola
   * recarga — encadenar dos `setFilter` haría dos viajes y dejaría el filtro anterior puesto en el
   * primero de ellos.
   */
  applyStatusFilter(value: unknown): void {
    const v = value == null ? '' : String(value);
    delete this.ctrl.state.filters.is_active;
    delete this.ctrl.state.filters.needs_tax_setup;
    if (v === STATUS_UNCONFIGURED) this.ctrl.state.filters.needs_tax_setup = '1';
    else if (v !== '') this.ctrl.state.filters.is_active = v;
    this.ctrl.state.page = 0;
    void this.ctrl.load();
  }

  @state() private detail: Product | null = null;
  /** Por qué no salió la etiqueta (inventory#44). Se pinta en el propio modal del detalle. */
  @state() private printError = '';

  // ── Recuento y recepción (inventory#7) ──────────────────────────────────────
  // Estado de los dos modales de stock. El recuento es ABSOLUTO: se enseña la
  // DIFERENCIA contra el stock actual ANTES de aplicar, y el motivo es obligatorio.
  @state() countTarget: Product | null = null;
  @state() countValue = '';
  @state() countReason = '';
  @state() receiveTarget: Product | null = null;
  @state() receiveQty = '';
  @state() receiveCost = '';

  /** Diferencia del recuento (nuevo − actual), o null si aún no hay valor tecleado. */
  get countDifference(): number | null {
    if (!this.countTarget || this.countValue.trim() === '') return null;
    const raw = parseQuantity(this.countValue);
    if (raw === null || !this.quantityMatchesUnit(raw, this.countTarget.unit_code)) return null;
    return fromMicro(raw - Number(this.countTarget.stock));
  }

  async submitCount(): Promise<void> {
    if (!can('inventory.adjust_stock') || !this.countTarget || this.countValue.trim() === '' || this.countReason.trim() === '') return;
    const raw = parseQuantity(this.countValue);
    if (raw === null) {
      this.formError = erplora().t(CATALOG, 'ui.errQuantity');
      return;
    }
    if (!this.quantityMatchesUnit(raw, this.countTarget.unit_code)) {
      this.formError = erplora().t(CATALOG, 'ui.errQuantityGrid');
      return;
    }
    try {
      await erplora().command('inventory.stock.adjust', {
        product_id: this.countTarget.id,
        stock: raw,
        reason: this.countReason.trim(),
      });
      this.countTarget = null;
      this.countValue = '';
      this.countReason = '';
      await this.ctrl.load();
    } catch (e) {
      this.formError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errCount');
    }
  }

  async submitReceive(): Promise<void> {
    if (!can('inventory.adjust_stock') || !this.receiveTarget || this.receiveQty.trim() === '') return;
    const qty = parseQuantity(this.receiveQty);
    if (qty === null || qty <= 0) {
      this.formError = erplora().t(CATALOG, 'ui.errQuantity');
      return;
    }
    if (!this.quantityMatchesUnit(qty, this.receiveTarget.unit_code)) {
      this.formError = erplora().t(CATALOG, 'ui.errQuantityGrid');
      return;
    }
    // El coste se teclea en EUROS y se guarda en CÉNTIMOS (ADR-0007/0123).
    const cost = this.receiveCost.trim() === '' ? null : Math.round(Number(this.receiveCost) * 100);
    try {
      await erplora().command('inventory.stock.receive', {
        items: [{ product_id: this.receiveTarget.id, qty, unit_cost: cost }],
      });
      this.receiveTarget = null;
      this.receiveQty = '';
      this.receiveCost = '';
      await this.ctrl.load();
    } catch (e) {
      this.formError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errReceive');
    }
  }

  // Acciones por fila (botones) → la tabla emite `rowAction` con { actionId, row }. Getter (i18n).
  get actions(): DataTableAction[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return [
      { id: 'detail', label: t('ui.actionDetail'), icon: 'eye-outline' },
      ...(can('inventory.adjust_stock')
        ? [
            { id: 'receive', label: t('ui.actionReceive'), icon: 'download-outline' },
            { id: 'count', label: t('ui.actionCount'), icon: 'calculator-outline' },
          ]
        : []),
      ...(can('inventory.change_product')
        ? [{ id: 'edit', label: t('ui.actionEdit'), icon: 'create-outline' }]
        : []),
      ...(can('inventory.delete_product')
        ? [{ id: 'delete', label: t('ui.actionDelete'), icon: 'trash-outline', color: 'danger' }]
        : []),
    ];
  }

  private async onRowAction(ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>): Promise<void> {
    const { actionId, row } = ev.detail;
    const p = row as unknown as Product;
    if (actionId === 'detail') {
      this.detail = p; // abre el modal de detalle (con código de barras)
    } else if (actionId === 'receive' && can('inventory.adjust_stock')) {
      this.receiveTarget = p;
    } else if (actionId === 'count' && can('inventory.adjust_stock')) {
      this.countTarget = p;
      this.countValue = '';
      this.countReason = '';
    } else if (actionId === 'edit' && can('inventory.change_product')) {
      // Edición REAL (inventory#8): carga la ficha COMPLETA desde products.get (la fila de la
      // lista no proyecta description/ean13) + las categorías M2M actuales, y fija editingId.
      this.editingId = p.id;
      try {
        const full = (await erplora().query<Product[]>('inventory.products.get', { product_id: p.id }))?.[0] ?? p;
        this.newName = full.name ?? '';
        this.newSku = full.sku ?? '';
        // La BD guarda CÉNTIMOS y el form edita EUROS (ADR-0123).
        this.newPrice = centsToEuros(full.price);
        this.newCost = centsToEuros((full as unknown as { cost?: number }).cost ?? 0);
        this.newThreshold = formatQuantity(
          (full as unknown as { low_stock_threshold?: number }).low_stock_threshold ?? 10_000_000,
        );
        this.newEan = String((full as unknown as { ean13?: string | null }).ean13 ?? '');
        this.newDescription = String((full as unknown as { description?: string }).description ?? '');
        this.newType = ((full as unknown as { product_type?: string }).product_type === 'service' ? 'service' : 'physical');
        this.newActive = Number((full as unknown as { is_active?: number }).is_active ?? 1) === 1;
        this.newUnitCode = String((full as unknown as { unit_code?: string }).unit_code || 'ud');
        this.newTaxCategoryKey = full.tax_category_key ?? '';
        const links = await erplora().query<{ product_id: string; category_id: string }[]>('inventory.product_categories');
        const mine = (Array.isArray(links) ? links : []).filter((l) => l.product_id === p.id).map((l) => l.category_id);
        this.initialCategoryIds = new Set(mine);
        this.selectedCategoryIds = new Set(mine);
      } catch {
        this.initialCategoryIds = new Set();
        this.selectedCategoryIds = new Set();
      }
      this.dataTable()?.open('create'); // abre el panel lateral con la ficha pre-rellenada
    } else if (actionId === 'delete' && can('inventory.delete_product')) {
      // Nunca borra directo (P1 QA #6): confirmación, como el borrado de categorías.
      this.deleteTarget = p;
    }
  }

  /** Ejecuta el borrado confirmado. */
  async confirmDelete(): Promise<void> {
    if (!this.deleteTarget) return;
    try {
      await erplora().command('inventory.products.delete', { product_id: this.deleteTarget.id });
      this.deleteTarget = null;
      await this.ctrl.load();
    } catch (e) {
      this.formError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errDeleteProduct');
      this.deleteTarget = null;
    }
  }

  private async toggleActive(p: Product, ev: Event): Promise<void> {
    if (!can('inventory.change_product')) return;
    const checked = (ev.target as HTMLInputElement).checked;
    try {
      // El command exige el conjunto COMPLETO de campos editables (schemas/product_update.json,
      // inventory#8): la fila de la lista no proyecta description/ean13, así que se lee la
      // ficha completa antes — reenviar un subconjunto BORRARÍA esos campos.
      const full = (await erplora().query<Record<string, unknown>[]>('inventory.products.get', { product_id: p.id }))?.[0] ?? {};
      await erplora().command('inventory.products.update', {
        product_id: p.id,
        name: p.name,
        price: p.price,
        cost: p.cost ?? 0,
        low_stock_threshold: p.low_stock_threshold ?? 10,
        ean13: (full.ean13 as string | null) ?? null,
        description: (full.description as string) ?? '',
        // De la ficha COMPLETA (autoridad), no de la fila: desde inventory#38 el command exige
        // una categoría no vacía, y un reenvío en blanco tumbaría el toggle con un error de schema.
        tax_category_key: (full.tax_category_key as string | undefined) ?? p.tax_category_key,
        is_active: checked ? 1 : 0,
      });
      await this.ctrl.load();
    } catch (e) {
      this.formError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errUpdateProduct');
    }
  }

  // Referencia al ok-data-table para abrir/cerrar su panel lateral (drawer).
  private dataTable(): { open(p?: 'filters' | 'create'): void; close(): void } | null {
    return this.renderRoot.querySelector('ok-data-table') as
      | { open(p?: 'filters' | 'create'): void; close(): void }
      | null;
  }

  // Importa productos desde CSV (cabeceras = name, sku, price, stock…). Crea uno por fila.
  // Cada fila resuelve su tipo de IVA por referencia (ADR-0066): la columna fiscal (tax/iva/vat/…)
  // se matchea contra los tipos existentes de `taxes`, los que falten (con un % real) se crean en
  // bloque, y el producto enlaza por `tax_category_key`. Vacío / sin columna → null = tipo por defecto
  // del hub. NO se convierten precios: "IVA incluido o no" lo gobierna el ajuste del hub/POS.
  private async onCsvImport(ev: CustomEvent<{ rows: Record<string, string>[] }>): Promise<void> {
    if (!can('inventory.import_product') || !can('inventory.add_product')) return;
    const rows = ev.detail.rows ?? [];

    // 1) Resolver la CATEGORÍA fiscal de cada fila (ADR-0085): el CSV trae texto de categoría
    // (food/pizza/…), se resuelve a la clave canónica vía alias/categoría existente.
    let map = new Map<string, string>();
    let unresolved: string[] = [];
    try {
      const res = await resolveTaxCategories(rows, erplora());
      map = res.map;
      unresolved = res.unresolved;
    } catch (e) {
      console.warn('[inventory] No se pudieron resolver las categorías fiscales del CSV:', e);
    }

    // 1b) Las filas que NO traen columna fiscal también necesitan una categoría (inventory#38):
    // sin ella el alta se rechaza. En vez de fallar el fichero entero —que es lo que le pasa al
    // cliente que llega con su listado de precios de toda la vida, sin columna de IVA— se pregunta
    // UNA categoría para todas ellas, por el mismo modal. La cadena vacía es su entrada en el mapa.
    if (rows.some((r) => !pickTaxValue(r)) && !map.has('')) {
      unresolved = [...unresolved, ''];
    }

    // 2) Si hay textos sin resolver → abrir el modal para que el usuario decida (elegir/crear);
    // la creación se aplaza hasta confirmar. Si no hay → crear directamente.
    if (unresolved.length > 0) {
      this.importRows = rows;
      this.importMap = map;
      this.importUnresolved = unresolved;
      const choice: typeof this.importChoice = {};
      for (const u of unresolved) choice[u] = { mode: 'pick', key: '', newKey: '', newName: u };
      this.importChoice = choice;
      // Asegura tener las categorías para el selector del modal.
      if (this.taxCategories.length === 0) await this.loadTaxCategories();
      this.importOpen = true;
      return;
    }
    await this.finalizeImport(rows, map);
  }

  // Aplica las decisiones del modal: por cada texto sin resolver, persiste el alias hacia una
  // categoría existente (learnAlias) o crea una categoría nueva + alias (createCategoryWithAlias),
  // actualiza el mapa y procede con la creación de productos (ADR-0085).
  private async confirmImportResolution(): Promise<void> {
    const map = new Map(this.importMap);
    for (const text of this.importUnresolved) {
      const c = this.importChoice[text];
      try {
        if (c?.mode === 'pick' && c.key) {
          await learnAlias(erplora(), text, c.key);
          map.set(normalizeAlias(text), c.key);
        } else if (c?.mode === 'create' && c.newKey.trim()) {
          const key = c.newKey.trim();
          await createCategoryWithAlias(erplora(), key, (c.newName || key).trim(), text);
          map.set(normalizeAlias(text), key);
        }
        // mode 'skip' (o pick sin key) → la fila queda sin categoría (null).
      } catch (e) {
        console.warn(`[inventory] No se pudo resolver la categoría "${text}":`, e);
      }
    }
    this.importOpen = false;
    await this.loadTaxCategories(); // refresca el selector con las categorías nuevas
    await this.finalizeImport(this.importRows, map);
  }

  // Crea un producto por fila enlazando su tax_category_key resuelto (o null = sin categoría).
  // Importa fila a fila con VALIDACIÓN previa e informe VISIBLE (inventory#13): nada de
  // `catch {}` — cada fila acaba en creada / omitida (duplicado en BD, política definida:
  // se salta y se cuenta, reintentable) / fallida (con línea FÍSICA del fichero y motivo).
  // El resumen se enseña en un modal y es copiable para corregir y reintentar.
  async finalizeImport(rows: Record<string, string>[], map: Map<string, string>): Promise<void> {
    const t = (k: string): string => erplora().t(CATALOG, k);
    const failed: { line: number; sku: string; reason: string }[] = [];
    let created = 0;
    let skipped = 0;
    const seenSkus = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const line = i + 2; // línea física del CSV (la cabecera es la 1)
      const sku = (r.sku ?? '').trim();
      const name = (r.name ?? '').trim();

      // Validación por fila ANTES de tocar el dispatcher.
      if (!name || !sku) {
        failed.push({ line, sku, reason: t('ui.importErrNameSku') });
        continue;
      }
      const price = eurosToCents(r.price);
      if (r.price !== undefined && r.price.trim() !== '' && !Number.isFinite(Number(r.price))) {
        failed.push({ line, sku, reason: t('ui.importErrPrice') });
        continue;
      }
      if (seenSkus.has(sku)) {
        failed.push({ line, sku, reason: t('ui.importErrDupFile') });
        continue;
      }
      seenSkus.add(sku);

      // Categoría fiscal de la fila: la resuelta por su texto, o —si la fila no traía columna— la
      // que el usuario eligió para todas (entrada `''` del mapa). Sin ninguna, la fila NO se manda
      // (inventory#38): el schema la rechazaría con un mensaje de validación que no dice nada, y un
      // producto que no sabe cómo tributa reventaría en el mostrador. Falla aquí, con su motivo.
      const taxCategoryKey = map.get(normalizeAlias(pickTaxValue(r))) ?? null;
      if (!taxCategoryKey) {
        failed.push({ line, sku, reason: t('ui.importErrTaxCategory') });
        continue;
      }
      const unitCode = (r.unit_code ?? 'ud').trim() || 'ud';
      const stock = r.stock?.trim() ? parseQuantity(r.stock) : 0;
      const threshold = r.low_stock_threshold?.trim() ? parseQuantity(r.low_stock_threshold) : 10_000_000;
      if (stock === null || threshold === null) {
        failed.push({ line, sku, reason: t('ui.errQuantity') });
        continue;
      }
      if (!this.quantityMatchesUnit(stock, unitCode) || !this.quantityMatchesUnit(threshold, unitCode)) {
        failed.push({ line, sku, reason: t('ui.errQuantityGrid') });
        continue;
      }
      try {
        await erplora().command('inventory.products.create', {
          name,
          sku,
          price,
          stock,
          cost: eurosToCents(r.cost),
          low_stock_threshold: threshold,
          product_type: 'physical',
          ean13: r.ean13 || null,
          description: r.description ?? '',
          tax_category_key: taxCategoryKey,
          unit_code: unitCode,
          image: '',
        });
        created++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // Política de duplicados en BD: OMITIR (contado, reintentable tras corregir).
        if (/unique|duplicate/i.test(msg)) {
          skipped++;
        } else {
          failed.push({ line, sku, reason: msg });
        }
      }
    }

    this.importReport = { total: rows.length, created, skipped, failed };
    this.importRows = [];
    this.importUnresolved = [];
    await this.ctrl.load();
  }

  /** Informe copiable: una línea por fila fallida (`línea N · SKU · motivo`). */
  importReportText(): string {
    const rep = this.importReport;
    if (!rep) return '';
    const head = `total=${rep.total} created=${rep.created} skipped=${rep.skipped} failed=${rep.failed.length}`;
    const lines = rep.failed.map((f) => `línea ${f.line} · ${f.sku || '—'} · ${f.reason}`);
    return [head, ...lines].join('\n');
  }

  // Modal de resolución de categorías del importador (ADR-0085): una fila por texto sin resolver,
  // con elegir categoría existente / crear nueva / omitir; al confirmar persiste el alias.
  private renderImportModal() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    const setChoice = (text: string, patch: Partial<(typeof this.importChoice)[string]>) => {
      this.importChoice = { ...this.importChoice, [text]: { ...this.importChoice[text], ...patch } };
    };
    return html`
      <ion-modal .isOpen=${this.importOpen} @ionModalDidDismiss=${() => (this.importOpen = false)}>
        <ion-header>
          <ion-toolbar>
            <ion-title>${t('ui.importTaxTitle')}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click=${() => (this.importOpen = false)}>${t('ui.btnCancel')}</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <p>${t('ui.importTaxHint')}</p>
          ${this.importUnresolved.map((text) => {
            const c = this.importChoice[text] ?? { mode: 'pick', key: '', newKey: '', newName: text };
            return html`<div style="border:1px solid var(--ion-border-color,#e6e2d8);border-radius:10px;padding:.6rem .8rem;margin-bottom:.7rem;">
              <!-- La cadena vacía no es un texto del CSV: es el cajón de las filas que no traen
                   columna fiscal (inventory#38). Pintarla entre comillas no diría nada. -->
              <strong>${text === '' ? t('ui.importTaxMissingLabel') : `"${text}"`}</strong>
              <ion-segment .value=${c.mode} @ionChange=${(e: any) => setChoice(text, { mode: e.detail.value })} style="margin:.5rem 0;">
                <ion-segment-button value="pick"><ion-label>${t('ui.importPick')}</ion-label></ion-segment-button>
                <ion-segment-button value="create"><ion-label>${t('ui.importCreate')}</ion-label></ion-segment-button>
                <ion-segment-button value="skip"><ion-label>${t('ui.importSkip')}</ion-label></ion-segment-button>
              </ion-segment>
              ${c.mode === 'pick'
                ? html`<ion-select fill="outline" label-placement="floating" label=${t('ui.colCategory')} .value=${c.key} @ionChange=${(e: any) => setChoice(text, { key: e.detail.value })}>
                    ${this.taxCategories.map((cat) => html`<ion-select-option .value=${cat.key}>${cat.name} (${cat.key})</ion-select-option>`)}
                  </ion-select>`
                : nothing}
              ${c.mode === 'create'
                ? html`<div style="display:flex;gap:.5rem;flex-wrap:wrap;">
                    <ion-input fill="outline" label-placement="floating" label=${t('ui.colKey')} placeholder="restaurant.food" .value=${c.newKey} @ionInput=${(e: any) => setChoice(text, { newKey: e.target.value })}></ion-input>
                    <ion-input fill="outline" label-placement="floating" label=${t('ui.colName')} .value=${c.newName} @ionInput=${(e: any) => setChoice(text, { newName: e.target.value })}></ion-input>
                  </div>`
                : nothing}
            </div>`;
          })}
          <ion-button expand="block" @click=${() => this.confirmImportResolution()}>${t('ui.importConfirm')}</ion-button>
        </ion-content>
      </ion-modal>
    `;
  }

  // Código de barras Code128 (SVG) del SKU. Barras NEGRAS fijas y `max-width` INLINE
  // (inventory#45): un código de barras no se tematiza —el escáner necesita oscuro sobre claro— y
  // las reglas del shadow no llegan al modal, que Ionic reparenta a <body>.
  private renderBarcode(text: string) {
    const bc = code128b(text, 2, 70);
    return html`<svg
      class="bc"
      style="max-width:100%; height:auto; background:#fff;"
      width=${bc.width}
      height=${bc.height}
      viewBox="0 0 ${bc.width} ${bc.height}"
      fill="#000"
    >
      ${bc.bars.map((b) => svg`<rect x=${b.x} y="0" width=${b.w} height=${bc.height}></rect>`)}
    </svg>`;
  }
  // Prints the barcode label through the SINGLE print gate (issue #30, ADR-0196 decision 5):
  // `erplora.print` (Bridge/label printer first) → isolated iframe. The old `window.open` popup
  // with an inline `window.print()` script bypassed the gate; contract in barcode-print.test.ts.
  //
  // The outcome is READ and SHOWN (inventory#44): the gate can cross fine and still print nothing
  // (no printer holding the `label` role, a refused document, the webview's dialog-less fallback),
  // and the old `void` turned every one of those into a button that did nothing without a word.
  private async printBarcode(p: Product): Promise<void> {
    this.printError = '';
    const t = (k: string): string => erplora().t(CATALOG, k);
    const out = await printBarcodeLabel({ sku: p.sku, name: p.name, priceCents: Number(p.price) });
    if (out.ok) return;
    const head = out.reason === 'no_printer' ? t('ui.errPrintBarcodeNoPrinter') : t('ui.errPrintBarcode');
    this.printError = out.detail ? `${head} (${out.detail})` : head;
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
    void this.loadTaxCategories();
    void this.loadProductCategories();
    void this.loadUnits();
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

  // Carga las CATEGORÍAS fiscales para el selector del formulario (ADR-0085). Que la query falle
  // (sin permiso, `taxes` degradado…) NO puede tumbar la página, pero desde inventory#38 tampoco
  // deja pasar el alta: sin catálogo no hay categoría que elegir, y el formulario lo dice en vez de
  // guardar un producto que nadie podrá cobrar. El % lo resuelve `taxes` por país+categoría.
  private async loadTaxCategories(): Promise<void> {
    try {
      const res = await erplora().queryAll<TaxCategory>('taxes.categories.list', { sort: 'name', dir: 'asc' });
      // `Array.isArray`, no `?? []`: si esto NO es una lista, `.map()` peta EN EL RENDER y se lleva
      // por delante la página de productos entera — por un desplegable de IVA. El alta de productos
      // no puede depender de que `taxes` conteste bien.
      this.taxCategories = Array.isArray(res) ? res : [];
    } catch {
      this.taxCategories = [];
    }
  }

  // Opciones del ion-select: una categoría por fila, etiqueta "Nombre (key)". SIN opción vacía
  // (inventory#38): "— (por defecto)" era la puerta trasera por la que entraba un producto que no
  // sabía cómo tributa. El hueco se cubre con el `placeholder` del select, que no es elegible.
  private taxOptions() {
    return this.taxCategories.map(
      (c) => html`<ion-select-option .value=${c.key}>${c.name} (${c.key})</ion-select-option>`,
    );
  }

  // Registro de unidades (ADR-0147) para el selector de la ficha. Best-effort como el de
  // categorías fiscales: si la query falla, el select se queda con 'ud' y el alta sigue.
  private async loadUnits(): Promise<void> {
    try {
      const rows = await erplora().queryAll<Unit>('inventory.units.list');
      this.units = Array.isArray(rows) ? rows : [];
    } catch {
      this.units = [];
    }
  }

  /** Incremento exacto de la unidad. Sin catálogo, `ud` conserva su rejilla natural de 1. */
  private unitIncrement(code: string | undefined): number {
    const normalized = code || 'ud';
    const configured = this.units.find((unit) => unit.code === normalized)?.increment_value;
    return Number(configured ?? (normalized === 'ud' ? 1_000_000 : 0));
  }

  private quantityMatchesUnit(raw: number, unitCode: string | undefined): boolean {
    return onGrid(raw, this.unitIncrement(unitCode));
  }

  private quantityStep(unitCode: string | undefined): string {
    const increment = this.unitIncrement(unitCode);
    return increment > 0 ? formatQuantity(increment) : '0.000001';
  }

  /** Los filtros de la tabla también son entrada humana; el servidor espera los extremos en µ. */
  private stockFilterValue(value: unknown): unknown {
    if (typeof value !== 'object' || value === null) return value;
    const scaled: Record<string, unknown> = {};
    for (const [edge, logical] of Object.entries(value as Record<string, unknown>)) {
      if (logical === '' || logical == null) scaled[edge] = logical;
      else scaled[edge] = parseQuantity(String(logical)) ?? logical;
    }
    return scaled;
  }

  /** Etiqueta del selector: «Kilogramo (kg)» / «Kilogram (kg)» según locale (ADR-0055). */
  unitLabel(u: Unit): string {
    const es = (erplora().locale ?? '').startsWith('es');
    return `${(es && u.name_es) || u.name} (${u.code})`;
  }

  // Opciones del ion-select de unidad. Sin registro cargado (query fallida) queda al menos la
  // unidad suelta, que es el default del contrato.
  private unitOptions() {
    const list: Unit[] = this.units.length
      ? this.units
      : [{ id: '', code: 'ud', name: 'Unit', name_es: 'Unidad' }];
    return list.map((u) => html`<ion-select-option .value=${u.code}>${this.unitLabel(u)}</ion-select-option>`);
  }

  /** Categorías de producto del hub (para el multi-select de la ficha, inventory#8). */
  private async loadProductCategories(): Promise<void> {
    try {
      const rows = await erplora().queryAll<{ id: string; name: string }>('inventory.categories.list');
      this.productCategories = Array.isArray(rows) ? rows : [];
    } catch {
      this.productCategories = [];
    }
  }

  /** Vuelve al modo ALTA limpio (inventory#8): tras editar, el siguiente «+» no hereda datos.
   *  También CIERRA el panel lateral (QA 07-16: quedaba abierto con el form vacío). */
  cancelEdit(): void {
    this.dataTable()?.close();
    this.editingId = null;
    this.newName = '';
    this.newSku = '';
    this.newPrice = '';
    this.newCost = '';
    this.newStock = '';
    this.newThreshold = '';
    this.newEan = '';
    this.newDescription = '';
    this.newType = 'physical';
    this.newActive = true;
    this.newUnitCode = 'ud';
    this.newTaxCategoryKey = '';
    this.initialCategoryIds = new Set();
    this.selectedCategoryIds = new Set();
    this.formError = '';
  }

  // Submit del form (alta O edición — decide `editingId`, inventory#8). El nombre se
  // conserva por compatibilidad con el template/tests históricos.
  async createProduct(ev: Event): Promise<void> {
    ev.preventDefault();
    const requiredPermission = this.editingId
      ? 'inventory.change_product'
      : 'inventory.add_product';
    if (!can(requiredPermission) || !this.newName.trim() || !this.newSku.trim()) return;
    const t = (k: string): string => erplora().t(CATALOG, k);
    // Categoría fiscal OBLIGATORIA (inventory#38), y explicada: el botón deshabilitado ya lo
    // impide, pero un botón muerto no dice POR QUÉ. También cubre la edición: un producto
    // configurado no se puede des-configurar vaciando el selector.
    if (!this.newTaxCategoryKey) {
      this.formError = t('ui.errTaxCategoryRequired');
      return;
    }
    this.saving = true;
    this.formError = '';
    try {
      const threshold = this.newThreshold.trim() === ''
        ? 10_000_000
        : parseQuantity(this.newThreshold);
      if (threshold === null) throw new Error(t('ui.errQuantity'));
      if (!this.quantityMatchesUnit(threshold, this.newUnitCode)) {
        throw new Error(t('ui.errQuantityGrid'));
      }
      if (this.editingId) {
        // EDICIÓN real: update conservando la identidad (el stock NO se edita aquí —
        // es autoridad del ledger #7: recuento/recepción).
        await erplora().command('inventory.products.update', {
          product_id: this.editingId,
          name: this.newName.trim(),
          price: eurosToCents(this.newPrice),
          cost: eurosToCents(this.newCost),
          low_stock_threshold: threshold,
          ean13: this.newEan.trim() || null,
          description: this.newDescription,
          tax_category_key: this.newTaxCategoryKey,
          is_active: this.newActive ? 1 : 0,
          // Se envía SIEMPRE (no solo si cambió): el comando hace COALESCE y reenviar la
          // actual es idempotente; omitirla también sería válido (se conservaría).
          unit_code: this.newUnitCode,
        });
        // Sincroniza el M2M por diferencias (solo lo que cambió).
        for (const cid of this.selectedCategoryIds) {
          if (!this.initialCategoryIds.has(cid)) {
            await erplora().command('inventory.products.add_category', {
              product_id: this.editingId, category_id: cid,
            });
          }
        }
        for (const cid of this.initialCategoryIds) {
          if (!this.selectedCategoryIds.has(cid)) {
            await erplora().command('inventory.products.remove_category', {
              product_id: this.editingId, category_id: cid,
            });
          }
        }
      } else {
        const stock = this.newStock.trim() === '' ? 0 : parseQuantity(this.newStock);
        if (stock === null) throw new Error(t('ui.errQuantity'));
        if (!this.quantityMatchesUnit(stock, this.newUnitCode)) {
          throw new Error(t('ui.errQuantityGrid'));
        }
        // ALTA. El input es EUROS (`step="0.01"`); la columna es INTEGER de céntimos
        // (ADR-0007). Sin esta frontera, teclear «2,20» guardaba 2 céntimos.
        await erplora().command('inventory.products.create', {
          name: this.newName.trim(),
          sku: this.newSku.trim(),
          price: eurosToCents(this.newPrice),
          cost: eurosToCents(this.newCost),
          stock,
          low_stock_threshold: threshold,
          product_type: this.newType,
          ean13: this.newEan.trim() || null,
          description: this.newDescription,
          tax_category_key: this.newTaxCategoryKey,
          unit_code: this.newUnitCode,
          image: '',
        });
      }
      this.cancelEdit();
      this.dataTable()?.close(); // cierra el panel lateral tras guardar
      await this.ctrl.load(); // refresco inmediato (además del evento)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Errores de unicidad explicados JUNTO al campo (inventory#8), no genéricos.
      if (/unique|duplicate/i.test(msg) && /sku/i.test(msg)) {
        this.formError = t('ui.errSkuTaken');
      } else if (/unique|duplicate/i.test(msg) && /ean/i.test(msg)) {
        this.formError = t('ui.errEanTaken');
      } else {
        this.formError = msg || t('ui.errSaveProduct');
      }
    } finally {
      this.saving = false;
    }
  }

  render() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return html`
      <div class="page">
        ${this.formError ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : nothing}
        ${this.ctrl?.error ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : nothing}

        <ok-data-table
          .serverSide=${true}
          .fill=${true}
          .labels=${dataTableLabels(erplora().locale)}
          .columns=${this.columns}
          .actions=${this.actions}
          .addable=${can('inventory.add_product')}
          .views=${true}
          .cardTitle=${(row: Record<string, unknown>) => String(row.name ?? row.sku ?? '')}
          .columnPicker=${true}
          .importable=${can('inventory.import_product') && can('inventory.add_product')}
          .exportable=${can('inventory.export_product')}
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
          .searchPlaceholder=${erplora().t(CATALOG, 'ui.searchProduct')}
          .emptyMessage=${this.ctrl?.loading ? erplora().t(CATALOG, 'ui.loading') : erplora().t(CATALOG, 'ui.noProducts')}
          @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)}
          @pageSizeChange=${(e: CustomEvent<number>) => this.ctrl.setPageSize(e.detail)}
          @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) =>
            this.ctrl.setSort(e.detail.sort, e.detail.dir)}
          @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)}
          @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => {
            // La columna de estado tiene TRES valores repartidos en DOS columnas del servidor
            // (inventory#38): su filtro no es un `setFilter` directo.
            if (e.detail.col === 'is_active') return this.applyStatusFilter(e.detail.value);
            this.ctrl.setFilter(
              e.detail.col,
              e.detail.col === 'stock' ? this.stockFilterValue(e.detail.value) : e.detail.value,
            );
          }}
        >
          <!-- Formulario de alta: el botón "+" del data-table despliega este acordeón. -->
          <form slot="create" class="form" @submit=${(e: Event) => this.createProduct(e)}>
            ${this.editingId
              ? html`<div class="drow" style="align-items:center;">
                  <b>${erplora().t(CATALOG, 'ui.editingTitle')}</b>
                  <ion-button size="small" fill="clear" @click=${() => this.cancelEdit()}>
                    ${erplora().t(CATALOG, 'ui.editingCancel')}
                  </ion-button>
                </div>`
              : nothing}
            <ion-input
              fill="outline"
              label=${erplora().t(CATALOG, 'ui.name')}
              label-placement="floating"
              .value=${this.newName}
              @ionInput=${(e: Event) => (this.newName = (e.target as HTMLInputElement).value)}
            ></ion-input>
            <ion-input
              fill="outline"
              label="SKU"
              label-placement="floating"
              .value=${this.newSku}
              .disabled=${!!this.editingId}
              helper-text=${this.editingId ? erplora().t(CATALOG, 'ui.skuIdentity') : ''}
              @ionInput=${(e: Event) => (this.newSku = (e.target as HTMLInputElement).value)}
            ></ion-input>
            <ion-input
              fill="outline"
              label=${erplora().t(CATALOG, 'ui.price')}
              label-placement="floating"
              type="number"
              step="0.01"
              .value=${this.newPrice}
              @ionInput=${(e: Event) => (this.newPrice = (e.target as HTMLInputElement).value)}
            ></ion-input>
            <ion-input
              fill="outline"
              label=${`${erplora().t(CATALOG, 'ui.fieldCost')} (${erplora().currency})`}
              label-placement="floating"
              type="number" step="0.01" min="0"
              .value=${this.newCost}
              @ionInput=${(e: Event) => (this.newCost = (e.target as HTMLInputElement).value)}
            ></ion-input>
            ${!this.editingId
              ? html`<ion-input
                  fill="outline"
                  label=${erplora().t(CATALOG, 'ui.fieldInitialStock')}
                  label-placement="floating"
                  type="number" .step=${this.quantityStep(this.newUnitCode)} min="0"
                  .value=${this.newStock}
                  @ionInput=${(e: Event) => (this.newStock = (e.target as HTMLInputElement).value)}
                ></ion-input>`
              : nothing}
            <ion-input
              fill="outline"
              label=${erplora().t(CATALOG, 'ui.fieldThreshold')}
              label-placement="floating"
              type="number" .step=${this.quantityStep(this.newUnitCode)} min="0"
              .value=${this.newThreshold}
              @ionInput=${(e: Event) => (this.newThreshold = (e.target as HTMLInputElement).value)}
            ></ion-input>
            <ion-input
              fill="outline"
              label="EAN-13"
              label-placement="floating"
              maxlength="13"
              .value=${this.newEan}
              @ionInput=${(e: Event) => (this.newEan = (e.target as HTMLInputElement).value)}
            ></ion-input>
            <ion-input
              fill="outline"
              label=${erplora().t(CATALOG, 'ui.fieldDescription')}
              label-placement="floating"
              .value=${this.newDescription}
              @ionInput=${(e: Event) => (this.newDescription = (e.target as HTMLInputElement).value)}
            ></ion-input>
            ${!this.editingId
              ? html`<ion-select
                  fill="outline"
                  label-placement="floating"
                  label=${erplora().t(CATALOG, 'ui.fieldType')}
                  .value=${this.newType}
                  @ionChange=${(e: Event) => (this.newType = ((e.target as HTMLInputElement).value === 'service' ? 'service' : 'physical'))}
                >
                  <ion-select-option value="physical">${erplora().t(CATALOG, 'ui.typePhysical')}</ion-select-option>
                  <ion-select-option value="service">${erplora().t(CATALOG, 'ui.typeService')}</ion-select-option>
                </ion-select>`
              : nothing}
            <ion-select
              fill="outline"
              label-placement="floating"
              interface="popover"
              label=${erplora().t(CATALOG, 'ui.fieldUnit')}
              .value=${this.newUnitCode}
              @ionChange=${(e: Event) => (this.newUnitCode = (e.target as HTMLInputElement).value || 'ud')}
            >
              ${this.unitOptions()}
            </ion-select>
            <!-- Categoría fiscal: campo OBLIGATORIO (inventory#38), no un asterisco decorativo.
                 Sin catálogo de categorías no hay nada que elegir, así que se dice en vez de
                 dejar guardar un producto que después nadie puede cobrar. -->
            <ion-select
              fill="outline"
              label-placement="floating"
              required
              label=${erplora().t(CATALOG, 'ui.fieldTaxCategory')}
              placeholder=${erplora().t(CATALOG, 'ui.taxCategoryPlaceholder')}
              .value=${this.newTaxCategoryKey}
              @ionChange=${(e: Event) => (this.newTaxCategoryKey = (e.target as HTMLInputElement).value)}
            >
              ${this.taxOptions()}
            </ion-select>
            ${this.taxCategories.length === 0
              ? html`<ok-inline-feedback tone="warning" icon="alert-circle-outline">
                  ${erplora().t(CATALOG, 'ui.taxNoneAvailable')}
                </ok-inline-feedback>`
              : nothing}
            ${this.productCategories.length
              ? html`<ion-select
                  fill="outline"
                  label-placement="floating"
                  label=${erplora().t(CATALOG, 'ui.fieldCategories')}
                  .multiple=${true}
                  .value=${[...this.selectedCategoryIds]}
                  @ionChange=${(e: CustomEvent) => {
                    const v = (e.detail as { value?: string[] }).value ?? [];
                    this.selectedCategoryIds = new Set(v);
                  }}
                >
                  ${this.productCategories.map(
                    (c) => html`<ion-select-option .value=${c.id}>${c.name}</ion-select-option>`,
                  )}
                </ion-select>`
              : nothing}
            <ion-button type="submit" ?disabled=${this.saving || !this.newName || !this.newSku || !this.newTaxCategoryKey}>
              ${this.saving
                ? erplora().t(CATALOG, 'ui.saving')
                : this.editingId
                  ? erplora().t(CATALOG, 'ui.saveChanges')
                  : erplora().t(CATALOG, 'ui.save')}
            </ion-button>
          </form>
        </ok-data-table>

        <ion-modal
          .isOpen=${!!this.detail}
          @ionModalDidDismiss=${() => {
            this.detail = null;
            this.printError = '';
          }}
        >
          <ion-header class="ion-no-border">
            <ion-toolbar>
              <ion-title>${this.detail?.name ?? ''}</ion-title>
              <ion-buttons slot="end">
                <ion-button aria-label=${erplora().t(CATALOG, 'ui.btnClose')} @click=${() => { this.detail = null; this.printError = ''; }}><ion-icon name="close" slot="icon-only"></ion-icon></ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            ${this.detail
              ? html`
                  <!-- Auto-estilado (reparent a <body>): las clases .detail/.drow/.barcode del
                       shadow NO llegan aquí — Ionic puro + estilos inline para el barcode. -->
                  <ion-list lines="full">
                    <ion-item>
                      <ion-label>SKU</ion-label>
                      <ion-note slot="end">${this.detail.sku}</ion-note>
                    </ion-item>
                    <ion-item>
                      <ion-label>${t('ui.price')}</ion-label>
                      <ion-note slot="end">${erplora().formatMoney(Number(this.detail.price))}</ion-note>
                    </ion-item>
                    <ion-item>
                      <ion-label>${t('ui.stock')}</ion-label>
                      <ion-note slot="end">${formatQuantity(this.detail.stock)}</ion-note>
                    </ion-item>
                    <ion-item>
                      <ion-label>${t('ui.status')}</ion-label>
                      <ion-note
                        slot="end"
                        color=${this.productStatus(this.detail as unknown as Record<string, unknown>).id === 'unconfigured' ? 'warning' : 'medium'}
                      >
                        ${this.productStatus(this.detail as unknown as Record<string, unknown>).label}
                        ${this.productStatus(this.detail as unknown as Record<string, unknown>).reason}
                      </ion-note>
                    </ion-item>
                  </ion-list>
                  <!-- Placa BLANCA con barras negras SIEMPRE, en los dos temas (inventory#45): sin
                       fondo propio heredaba el del modal (oscuro) y quedaba negro sobre negro,
                       ilegible para cualquier escáner. Inline porque el modal está reparentado. -->
                  <div style="text-align:center; margin:1rem 0; padding:1rem; border:1px solid #d7d2c8; border-radius:10px; background:#fff; color:#000;">
                    ${this.renderBarcode(this.detail.sku)}
                    <div style="font:14px ui-monospace,monospace; margin-top:.4rem; letter-spacing:.08em; color:#000;">${this.detail.sku}</div>
                  </div>
                  ${this.printError
                    ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.printError}</ok-inline-feedback>`
                    : nothing}
                  <ion-button expand="block" @click=${() => this.detail && void this.printBarcode(this.detail)}>
                    <ion-icon name="print-outline" slot="start"></ion-icon> ${t('ui.printBarcode')}
                  </ion-button>
                `
              : nothing}
          </ion-content>
        </ion-modal>
        ${this.renderDeleteModal()}
        ${this.renderCountModal()}
        ${this.renderReceiveModal()}
        ${this.renderImportModal()}
        ${this.renderImportReportModal()}
      </div>
    `;
  }

  // Informe del import CSV (inventory#13): total/creadas/omitidas/fallidas con línea y
  // motivo, copiable al portapapeles para corregir el fichero y reintentar.
  private renderImportReportModal() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    const rep = this.importReport;
    return html`
      <ion-modal .isOpen=${!!rep} @ionModalDidDismiss=${() => (this.importReport = null)}>
        <ion-header class="ion-no-border">
          <ion-toolbar>
            <ion-title>${t('ui.importReportTitle')}</ion-title>
            <ion-buttons slot="end">
              <ion-button aria-label=${t('ui.btnClose')} @click=${() => (this.importReport = null)}><ion-icon name="close" slot="icon-only"></ion-icon></ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          ${rep
            ? html`
                <!-- Auto-estilado (reparent a <body>): Ionic puro, sin clases del shadow. -->
                <ion-list lines="full">
                  <ion-item>
                    <ion-label>${t('ui.importTotal')}</ion-label>
                    <ion-note slot="end">${rep.total}</ion-note>
                  </ion-item>
                  <ion-item>
                    <ion-label>${t('ui.importCreated')}</ion-label>
                    <ion-note slot="end" color="success">${rep.created}</ion-note>
                  </ion-item>
                  <ion-item>
                    <ion-label>${t('ui.importSkipped')}</ion-label>
                    <ion-note slot="end">${rep.skipped}</ion-note>
                  </ion-item>
                  <ion-item>
                    <ion-label>${t('ui.importFailed')}</ion-label>
                    <ion-note slot="end" color=${rep.failed.length ? 'danger' : 'success'}>${rep.failed.length}</ion-note>
                  </ion-item>
                </ion-list>
                ${rep.failed.length
                  ? html`
                      <ion-list class="ion-margin-top" lines="none">
                        ${rep.failed.map(
                          (f) => html`<ion-item>
                            <ion-label class="ion-text-wrap">
                              <b>${t('ui.importLine')} ${f.line}</b> · ${f.sku || '—'} — ${f.reason}
                            </ion-label>
                          </ion-item>`,
                        )}
                      </ion-list>
                      <ion-button class="ion-margin-top" expand="block" fill="outline"
                        @click=${() => navigator.clipboard?.writeText(this.importReportText())}>
                        <ion-icon name="copy-outline" slot="start"></ion-icon>${t('ui.importCopy')}
                      </ion-button>
                    `
                  : nothing}
              `
            : nothing}
        </ion-content>
      </ion-modal>
    `;
  }

  // Confirmación de borrado de producto (P1 QA #6): paridad con el borrado de categorías.
  private renderDeleteModal() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return html`
      <ion-modal .isOpen=${!!this.deleteTarget} @ionModalDidDismiss=${() => (this.deleteTarget = null)}>
        <ion-header class="ion-no-border">
          <ion-toolbar>
            <ion-title>${t('ui.deleteProdTitle')}</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <ion-list lines="none">
            <ion-item>
              <ion-label class="ion-text-wrap">
                <b>${this.deleteTarget?.name ?? ''}</b> (${this.deleteTarget?.sku ?? ''}) — ${t('ui.deleteProdHint')}
              </ion-label>
            </ion-item>
          </ion-list>
          <ion-button class="ion-margin-top" expand="block" color="danger" @click=${() => this.confirmDelete()}>
            ${t('ui.actionDelete')}
          </ion-button>
          <ion-button expand="block" fill="outline" @click=${() => (this.deleteTarget = null)}>
            ${t('ui.btnCancel')}
          </ion-button>
        </ion-content>
      </ion-modal>
    `;
  }

  // Modal de RECUENTO (inventory#7): ajuste absoluto — se enseña la diferencia contra el
  // stock actual ANTES de aplicar, y el motivo es obligatorio (lo exige también el schema).
  private renderCountModal() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    const diff = this.countDifference;
    return html`
      <ion-modal .isOpen=${!!this.countTarget} @ionModalDidDismiss=${() => (this.countTarget = null)}>
        <ion-header class="ion-no-border">
          <ion-toolbar>
            <ion-title>${t('ui.countTitle')} — ${this.countTarget?.name ?? ''}</ion-title>
            <ion-buttons slot="end">
              <ion-button aria-label=${t('ui.btnClose')} @click=${() => (this.countTarget = null)}><ion-icon name="close" slot="icon-only"></ion-icon></ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <!-- OJO: ion-modal se re-aparenta a <body> y PIERDE el CSS del shadow del
               componente — el contenido debe AUTO-ESTILARSE (Ionic puro + ion-margin-*),
               nunca clases propias (.detail/.drow). Patrón de la casa (sales-list). -->
          <ion-list lines="full">
            <ion-item>
              <ion-label>${t('ui.countCurrent')}</ion-label>
              <ion-note slot="end">${formatQuantity(this.countTarget?.stock ?? 0)}</ion-note>
            </ion-item>
            ${diff !== null
              ? html`<ion-item>
                  <ion-label>${t('ui.countDiff')}</ion-label>
                  <ion-note slot="end" color=${diff < 0 ? 'danger' : 'success'}>${diff > 0 ? `+${diff}` : diff}</ion-note>
                </ion-item>`
              : nothing}
          </ion-list>
          <ion-input class="ion-margin-top" fill="outline" label-placement="floating" label=${t('ui.countNew')}
            type="number" .step=${this.quantityStep(this.countTarget?.unit_code)} min="0" inputmode="decimal"
            .value=${this.countValue}
            @ionInput=${(e: CustomEvent) => (this.countValue = String((e.detail as { value?: string }).value ?? ''))}
          ></ion-input>
          <ion-input class="ion-margin-top" fill="outline" label-placement="floating" label=${t('ui.countReason')}
            .value=${this.countReason} required
            @ionInput=${(e: CustomEvent) => (this.countReason = String((e.detail as { value?: string }).value ?? ''))}
          ></ion-input>
          <ion-button class="ion-margin-top" expand="block" .disabled=${diff === null || this.countReason.trim() === ''}
            @click=${() => this.submitCount()}>
            ${t('ui.countApply')}
          </ion-button>
        </ion-content>
      </ion-modal>
    `;
  }

  // Modal de RECEPCIÓN (inventory#7): entrada de mercancía por producto (qty decimal —
  // #10 — y coste unitario en euros → céntimos). El movimiento `reception` lo deja el SQL.
  private renderReceiveModal() {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return html`
      <ion-modal .isOpen=${!!this.receiveTarget} @ionModalDidDismiss=${() => (this.receiveTarget = null)}>
        <ion-header class="ion-no-border">
          <ion-toolbar>
            <ion-title>${t('ui.receiveTitle')} — ${this.receiveTarget?.name ?? ''}</ion-title>
            <ion-buttons slot="end">
              <ion-button aria-label=${t('ui.btnClose')} @click=${() => (this.receiveTarget = null)}><ion-icon name="close" slot="icon-only"></ion-icon></ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <!-- Auto-estilado (ver nota del modal de recuento): el reparent a <body> mata el CSS del shadow. -->
          <ion-list lines="full">
            <ion-item>
              <ion-label>${t('ui.countCurrent')}</ion-label>
              <ion-note slot="end">${formatQuantity(this.receiveTarget?.stock ?? 0)}</ion-note>
            </ion-item>
          </ion-list>
          <ion-input class="ion-margin-top" fill="outline" label-placement="floating" label=${t('ui.receiveQty')}
            type="number" .step=${this.quantityStep(this.receiveTarget?.unit_code)} min="0.000001" inputmode="decimal"
            .value=${this.receiveQty}
            @ionInput=${(e: CustomEvent) => (this.receiveQty = String((e.detail as { value?: string }).value ?? ''))}
          ></ion-input>
          <ion-input class="ion-margin-top" fill="outline" label-placement="floating" label=${`${t('ui.receiveCost')} (${erplora().currency})`}
            type="number" step="0.01" min="0" inputmode="decimal"
            .value=${this.receiveCost}
            @ionInput=${(e: CustomEvent) => (this.receiveCost = String((e.detail as { value?: string }).value ?? ''))}
          ></ion-input>
          <ion-button class="ion-margin-top" expand="block" .disabled=${this.receiveQty.trim() === ''}
            @click=${() => this.submitReceive()}>
            ${t('ui.receiveApply')}
          </ion-button>
        </ion-content>
      </ion-modal>
    `;
  }
}

define('erp-inventory-products', ErpInventoryProducts);
