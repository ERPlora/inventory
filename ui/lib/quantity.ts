// Frontera de cantidades de Inventory (ADR-0147).
//
// La base de datos y los comandos transportan enteros con escala 10⁶; la persona siempre trabaja
// con cantidades lógicas. Toda entrada y salida de la UI debe cruzar por estas funciones.

export const QUANTITY_SCALE = 1_000_000;

export function toMicro(qty: number): number {
  return Math.round(qty * QUANTITY_SCALE);
}

export function fromMicro(raw: number): number {
  return raw / QUANTITY_SCALE;
}

/** Admite punto o coma y rechaza más de seis decimales; nunca redondea datos del usuario. */
export function parseQuantity(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,6})?$/.test(normalized)) return null;
  const raw = Math.round(Number(normalized) * QUANTITY_SCALE);
  return Number.isSafeInteger(raw) && raw >= 0 ? raw : null;
}

/** Convierte el entero 10⁶ a texto lógico sin ceros de adorno. */
export function formatQuantity(raw: number | string): string {
  const value = Number(raw);
  return Number.isFinite(value) ? String(fromMicro(value)) : String(raw);
}

/** Valida el incremento de la unidad; no corrige ni redondea silenciosamente. */
export function onGrid(raw: number, increment: number): boolean {
  return !Number.isFinite(increment) || increment <= 0 || raw % increment === 0;
}
