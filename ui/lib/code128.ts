// Generador de código de barras Code128-B (SVG), puro y CSP-safe (sin eval, sin deps).
// Devuelve las barras como rects para que el WC las pinte con el `svg` template de Lit.
// Code128-B cubre ASCII 32..126 (alfanumérico) → vale para SKU.

const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];
const START_B = 104;
const STOP = 106;

export interface Barcode {
  width: number;
  height: number;
  bars: Array<{ x: number; w: number }>;
}

/** Genera las barras de un Code128-B. `module` = ancho del módulo base (px), `height` = alto. */
export function code128b(text: string, module = 2, height = 70): Barcode {
  const codes = [START_B];
  let sum = START_B;
  let pos = 1;
  for (const ch of text) {
    const v = ch.charCodeAt(0) - 32;
    if (v < 0 || v > 94) continue; // fuera de Code128-B
    codes.push(v);
    sum += v * pos;
    pos += 1;
  }
  codes.push(sum % 103); // checksum
  codes.push(STOP);

  const bars: Array<{ x: number; w: number }> = [];
  let x = 0;
  for (const c of codes) {
    const pat = PATTERNS[c];
    for (let j = 0; j < pat.length; j++) {
      const w = Number(pat[j]) * module;
      if (j % 2 === 0) bars.push({ x, w }); // posiciones pares = barra negra
      x += w;
    }
  }
  return { width: x, height, bars };
}
