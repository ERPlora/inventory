import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';

// Vista "Settings" del módulo inventory. SIN botón guardar: al cambiar un ajuste se pide
// CONFIRMACIÓN (ion-alert); si el usuario confirma se aplica (command), si cancela se revierte.

interface ErploraClientLike {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
}

interface Settings {
  allow_sell_without_stock?: number;
  low_stock_threshold?: number;
  track_stock?: number;
}

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

const GREEN = '--track-background-checked: rgba(var(--ion-color-success-rgb, 45,211,111), 0.5); --handle-background-checked: var(--ion-color-success, #2dd36f);';

export class ErpInventorySettings extends LitElement {
  static styles = css`
    :host { display: block; height: 100%; overflow: auto; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    .card { background: var(--ion-card-background, #fff); border: 1px solid var(--ion-border-color, #e6e2d8); border-radius: 12px; overflow: hidden; }
    h2 { font-size: 1.1rem; margin: 0 0 0.75rem; }
    /* Diálogo de confirmación inline (alerta) — fiable y CSP-safe. */
    .scrim { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.32); z-index: 1000; display: grid; place-items: center; }
    .dialog { background: var(--ion-card-background, #fff); border-radius: 14px; width: 320px; max-width: 90vw; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25); overflow: hidden; }
    .dialog .dh { padding: 1.1rem 1.25rem 0.25rem; font-weight: 700; font-size: 1.05rem; }
    .dialog .dm { padding: 0 1.25rem 1rem; color: var(--ion-color-medium, #555); }
    .dialog .da { display: flex; justify-content: flex-end; gap: 0.25rem; padding: 0.25rem 0.75rem 0.75rem; }
  `;

  @state() private s: Settings = {};
  private prev: Settings = {};
  @state() private confirmOpen = false;
  @state() private confirmMsg = '';

  async firstUpdated(): Promise<void> {
    try {
      this.s = (await erplora().query<Settings>('inventory.settings.get')) ?? {};
    } catch {
      this.s = {};
    }
  }

  // Cambio optimista + confirmación; al cancelar se revierte al snapshot previo.
  private change<K extends keyof Settings>(key: K, value: Settings[K], label: string): void {
    this.prev = { ...this.s };
    this.s = { ...this.s, [key]: value };
    this.confirmMsg = `¿Aplicar el cambio en "${label}"?`;
    this.confirmOpen = true;
  }
  private async apply(): Promise<void> {
    this.confirmOpen = false;
    try {
      await erplora().command('inventory.settings.update', { ...this.s });
    } catch {
      this.s = { ...this.prev }; // si falla, revierte
    }
  }
  private cancel(): void {
    this.s = { ...this.prev };
    this.confirmOpen = false;
  }

  render() {
    return html`
      <h2>Ajustes de inventario</h2>
      <div class="card">
        <ion-list>
          <ion-item>
            <ion-toggle
              style=${GREEN}
              ?checked=${!!this.s.allow_sell_without_stock}
              @ionChange=${(e: Event) =>
                this.change('allow_sell_without_stock', (e.target as HTMLInputElement).checked ? 1 : 0, 'Permitir vender sin stock')}
            >
              Permitir vender sin stock
            </ion-toggle>
          </ion-item>
          <ion-item>
            <ion-toggle
              style=${GREEN}
              ?checked=${this.s.track_stock !== 0}
              @ionChange=${(e: Event) =>
                this.change('track_stock', (e.target as HTMLInputElement).checked ? 1 : 0, 'Controlar stock')}
            >
              Controlar stock
            </ion-toggle>
          </ion-item>
          <ion-item lines="none">
            <ion-input
              type="number"
              label="Umbral de stock bajo"
              label-placement="stacked"
              .value=${String(this.s.low_stock_threshold ?? 10)}
              @ionChange=${(e: Event) =>
                this.change('low_stock_threshold', Number((e.target as HTMLInputElement).value) || 0, 'Umbral de stock bajo')}
            ></ion-input>
          </ion-item>
        </ion-list>
      </div>

      ${this.confirmOpen
        ? html`
            <div class="scrim" @click=${() => this.cancel()}>
              <div class="dialog" role="alertdialog" @click=${(e: Event) => e.stopPropagation()}>
                <div class="dh">Confirmar cambio</div>
                <div class="dm">${this.confirmMsg}</div>
                <div class="da">
                  <ion-button fill="clear" color="medium" @click=${() => this.cancel()}>Cancelar</ion-button>
                  <ion-button @click=${() => this.apply()}>Aplicar</ion-button>
                </div>
              </div>
            </div>
          `
        : nothing}
    `;
  }
}

define('erp-inventory-settings', ErpInventorySettings);
