import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { resolveTaxCategories, pickTaxValue, normalizeAlias } from '../../lib/tax-resolve';
import { taxCategoryDisplayName } from '../../lib/tax-category-option';
// Catálogo i18n del módulo (ADR-0055): esbuild inlinea estos JSON en el dist del WC.
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';
const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-inline-feedback';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn, DataTableAction } from '@erplora/outfitkit';
import { createListController, dataTableLabels } from '@erplora/module-sdk';
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
  hasPermission?(permission: string): boolean;
  locale: string;
  /** i18n del módulo (ADR-0055). */
  t(catalog: Record<string, unknown>, key: string): string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  product_count: number;
  tax_category_key: string | null;
}

// Fila de `taxes.categories.list` (la CATEGORÍA fiscal es lo enlazable, ADR-0085). `display_name` es
// la etiqueta ya resuelta al idioma del hub por `taxes` (taxes#38): se pinta esa, se guarda la
// `key` (inventory#64).
interface TaxCategory {
  id: string;
  key: string;
  name: string;
  display_name?: string;
  is_system?: number;
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

export class ErpInventoryCategories extends LitElement {
  static styles = css`
    :host { display: flex; flex-direction: column; height: 100%; min-height: 0; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    .page { display: flex; flex-direction: column; min-height: 0; flex: 1 1 auto; gap: 0.75rem; }
    .page > ok-data-table { flex: 1 1 auto; min-height: 0; }
    .form { display: flex; flex-direction: column; gap: 0.7rem; }
    .form ion-button { align-self: flex-end; }
    .err { color: #d9480f; font-weight: 600; margin: 0; }
  `;

  @state() newName = '';
  @state() private newSlug = '';
  @state() private newTaxRateId = ''; // '' = tipo por defecto del hub (se envía null)
  @state() private taxRates: TaxCategory[] = [];
  @state() private saving = false;
  @state() private formError = '';
  // Edición REAL (inventory#8): id en edición (null = alta); el submit decide create/update.
  @state() editingId: string | null = null;
  // Fila completa en edición: preserva los campos que el form no expone (icon/color/order).
  private editRow: Record<string, unknown> | null = null;
  // Borrado con impacto (inventory#8): la confirmación enseña cuántos productos quedan
  // desvinculados (política: DESVINCULAR — los productos siguen, pierden la categoría).
  @state() deleteTarget: Category | null = null;
  @state() deleteImpact = 0;

  private ctrl!: ListController<Category>;

  private get columns(): DataTableColumn[] {
    const t = (key: string): string => erplora().t(CATALOG, key);
    return [
      { key: 'name', header: t('ui.name'), sortable: true, filterable: true, filterType: 'text' },
      { key: 'slug', header: 'Slug', sortable: true, filterable: true, filterType: 'text' },
      { key: 'product_count', header: t('ui.products'), align: 'right', sortable: true, filterable: true, filterType: 'range' },
    ];
  }

  private get actions(): DataTableAction[] {
    const t = (key: string): string => erplora().t(CATALOG, key);
    return [
      ...(can('inventory.change_category')
        ? [{ id: 'edit', label: t('ui.actionEdit'), icon: 'create-outline' }]
        : []),
      ...(can('inventory.delete_category')
        ? [{ id: 'delete', label: t('ui.actionDelete'), icon: 'trash-outline', color: 'danger' }]
        : []),
    ];
  }

  private readonly onLocaleChange = (): void => this.requestUpdate();

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
  }

  async firstUpdated(): Promise<void> {
    this.ctrl = createListController<Category>(erplora(), 'inventory.categories.list', () => this.requestUpdate(), {
      pageSize: 25,
      sort: 'name',
      dir: 'asc',
    });
    await this.ctrl.load();
    void this.loadTaxRates();
  }

  disconnectedCallback(): void {
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
    super.disconnectedCallback();
  }

  // Carga los tipos de IVA/impuesto para el selector del formulario (ADR-0066/0069). Best-effort:
  // si falla (módulo `taxes` no instalado, sin permiso…), el select queda con solo "— (por defecto)"
  // y el alta sigue funcionando (tax_category_key = null = tipo por defecto del hub).
  private async loadTaxRates(): Promise<void> {
    try {
      // Por `display_name`: se ordena por lo que el usuario LEE, no por el inglés del seed
      // (inventory#64). `taxes` acepta esa columna en la whitelist de `sort` de su query.
      this.taxRates = await erplora().queryAll<TaxCategory>('taxes.categories.list', { sort: 'display_name', dir: 'asc' });
    } catch {
      this.taxRates = [];
    }
  }

  // Opciones del ion-select: "— (sin categoría)" (valor '') + una categoría por fila (value = key).
  // El texto es `display_name` —la etiqueta que `taxes` ya devuelve en el idioma del hub— con `name`
  // de reserva para un hub con `taxes` anterior a la 2.3.8 (inventory#64). Nunca al revés: preferir
  // `name` sería enseñar el inglés del seed teniendo la traducción delante.
  private taxOptions() {
    return html`
      <ion-select-option value="">${erplora().t(CATALOG, 'ui.taxDefault')}</ion-select-option>
      ${this.taxRates.map(
        (c) => html`<ion-select-option .value=${c.key}>${taxCategoryDisplayName(c) || c.key} (${c.key})</ion-select-option>`,
      )}
    `;
  }

  private async onRowAction(ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>): Promise<void> {
    const { actionId, row } = ev.detail;
    const c = row as unknown as Category;
    if (actionId === 'edit' && can('inventory.change_category')) {
      this.editingId = c.id; // edición REAL (inventory#8): el submit hará update
      // Guarda la fila completa: el update envía el conjunto entero y los campos que el
      // form no edita (icon/color/order/description) se REENVÍAN tal cual — si se omiten,
      // los defaults del schema los machacarían (icon volvería a 'cube-outline').
      this.editRow = row;
      this.newName = c.name;
      this.newSlug = c.slug;
      this.newTaxRateId = c.tax_category_key ?? ''; // pre-selecciona el tipo de IVA actual
      this.dataTable()?.open('create');
    } else if (actionId === 'delete' && can('inventory.delete_category')) {
      // Nunca borra directo (inventory#8): confirma enseñando el IMPACTO (productos
      // vinculados que quedarán sin esta categoría).
      //
      // La cifra viene EN LA FILA (`product_count` de `categories.list`, la misma columna que se
      // ve en la rejilla, con el mismo criterio: productos activos y no borrados). Antes se pedía
      // `inventory.product_categories` y se contaba en cliente: una query sin bloque `list`
      // devuelve TODAS sus filas (`queries.rs::execute`), o sea una por pareja producto-categoría
      // de todo el catálogo, para pintar un número que ya estaba en pantalla.
      this.deleteImpact = Number(row.product_count ?? 0);
      this.deleteTarget = c;
    }
  }

  /** Ejecuta el borrado confirmado (política definida: DESVINCULAR; los productos siguen). */
  async confirmDelete(): Promise<void> {
    if (!can('inventory.delete_category') || !this.deleteTarget) return;
    try {
      await erplora().command('inventory.categories.delete', { category_id: this.deleteTarget.id });
      this.deleteTarget = null;
      this.deleteImpact = 0;
      await this.ctrl.load();
    } catch (e) {
      this.formError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errDeleteCategory');
      this.deleteTarget = null;
    }
  }

  /** Vuelve al modo ALTA limpio (inventory#8). */
  cancelEdit(): void {
    this.editingId = null;
    this.editRow = null;
    this.newName = '';
    this.newSlug = '';
    this.newTaxRateId = '';
    this.formError = '';
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
    if (!can('inventory.add_category')) return;
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

  // Submit del form: alta O edición según `editingId` (inventory#8 — antes editar
  // llamaba a create y duplicaba la categoría en silencio).
  async create(ev: Event): Promise<void> {
    ev.preventDefault();
    const requiredPermission = this.editingId
      ? 'inventory.change_category'
      : 'inventory.add_category';
    if (!can(requiredPermission) || !this.newName.trim()) return;
    this.saving = true;
    this.formError = '';
    try {
      const slug = this.newSlug.trim() || this.newName.trim().toLowerCase().replace(/\s+/g, '-');
      if (this.editingId) {
        const r = this.editRow ?? {};
        await erplora().command('inventory.categories.update', {
          category_id: this.editingId,
          name: this.newName.trim(),
          slug,
          // Campos no editados en el form: se reenvían para que los defaults del schema
          // no los machaquen (inventory#8).
          icon: (r.icon as string) ?? 'cube-outline',
          color: (r.color as string) ?? '#3880ff',
          description: (r.description as string) ?? '',
          order: Number(r.order ?? 0),
          is_active: Number((r as { is_active?: number }).is_active ?? 1),
          tax_category_key: this.newTaxRateId || null,
        });
      } else {
        await erplora().command('inventory.categories.create', {
          name: this.newName.trim(),
          slug,
          tax_category_key: this.newTaxRateId || null,
        });
      }
      this.cancelEdit();
      this.dataTable()?.close();
      await this.ctrl.load();
    } catch (e) {
      this.formError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errSaveCategory');
    } finally {
      this.saving = false;
    }
  }

  render() {
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
          .addable=${can('inventory.add_category')}
          .views=${true}
          .cardTitle=${(row: Record<string, unknown>) => String(row.name ?? '')}
          .columnPicker=${true}
          .importable=${can('inventory.add_category')}
          .exportable=${can('inventory.export_product')}
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
          .searchPlaceholder=${erplora().t(CATALOG, 'ui.searchCategory')}
          .emptyMessage=${this.ctrl?.loading ? erplora().t(CATALOG, 'ui.loading') : erplora().t(CATALOG, 'ui.noCategories')}
          @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)}
          @pageSizeChange=${(e: CustomEvent<number>) => this.ctrl.setPageSize(e.detail)}
          @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) =>
            this.ctrl.setSort(e.detail.sort, e.detail.dir)}
          @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)}
          @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) =>
            this.ctrl.setFilter(e.detail.col, e.detail.value)}
        >
          <form slot="create" class="form" @submit=${(e: Event) => this.create(e)}>
            <ion-input mode="md"
              fill="outline"
              label=${erplora().t(CATALOG, 'ui.name')}
              label-placement="floating"
              .value=${this.newName}
              @ionInput=${(e: Event) => (this.newName = (e.target as HTMLInputElement).value)}
            ></ion-input>
            <ion-input mode="md"
              fill="outline"
              label=${erplora().t(CATALOG, 'ui.slugOptional')}
              label-placement="floating"
              .value=${this.newSlug}
              @ionInput=${(e: Event) => (this.newSlug = (e.target as HTMLInputElement).value)}
            ></ion-input>
            <ion-select mode="md"
              fill="outline"
              label-placement="floating"
              label=${erplora().t(CATALOG, 'ui.taxRate')}
              .value=${this.newTaxRateId}
              @ionChange=${(e: Event) => (this.newTaxRateId = (e.target as HTMLInputElement).value)}
            >
              ${this.taxOptions()}
            </ion-select>
            ${this.editingId
              ? html`<ion-button size="small" fill="clear" @click=${() => this.cancelEdit()}>
                  ${erplora().t(CATALOG, 'ui.editingCancel')}
                </ion-button>`
              : nothing}
            <ion-button type="submit" ?disabled=${this.saving || !this.newName}>
              ${this.saving
                ? erplora().t(CATALOG, 'ui.saving')
                : this.editingId
                  ? erplora().t(CATALOG, 'ui.saveChanges')
                  : erplora().t(CATALOG, 'ui.save')}
            </ion-button>
          </form>
        </ok-data-table>

        <!-- Confirmación de borrado con IMPACTO (inventory#8): política = desvincular. -->
        <ion-modal .isOpen=${!!this.deleteTarget} @ionModalDidDismiss=${() => (this.deleteTarget = null)}>
          <ion-header class="ion-no-border">
            <ion-toolbar>
              <ion-title>${erplora().t(CATALOG, 'ui.deleteCatTitle')}</ion-title>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <!-- Auto-estilado: el reparent de ion-modal a <body> mata el CSS del shadow. -->
            <ion-list lines="none">
              <ion-item>
                <ion-label class="ion-text-wrap">
                  <b>${this.deleteTarget?.name ?? ''}</b> —
                  ${this.deleteImpact} ${erplora().t(CATALOG, 'ui.deleteCatImpact')}
                </ion-label>
              </ion-item>
            </ion-list>
            <ion-button class="ion-margin-top" expand="block" color="danger" @click=${() => this.confirmDelete()}>
              ${erplora().t(CATALOG, 'ui.deleteCatConfirm')}
            </ion-button>
            <ion-button expand="block" fill="outline" @click=${() => (this.deleteTarget = null)}>
              ${erplora().t(CATALOG, 'ui.btnCancel')}
            </ion-button>
          </ion-content>
        </ion-modal>
      </div>
    `;
  }
}

define('erp-inventory-categories', ErpInventoryCategories);
