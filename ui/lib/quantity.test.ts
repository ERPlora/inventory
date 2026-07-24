import { describe, expect, it } from 'vitest';
import { formatQuantity, fromMicro, onGrid, parseQuantity, toMicro } from './quantity';

describe('frontera de cantidades 10⁶', () => {
  it('convierte en ambos sentidos sin confundir cantidades con dinero', () => {
    expect(toMicro(2.5)).toBe(2_500_000);
    expect(fromMicro(2_500_000)).toBe(2.5);
    expect(formatQuantity(2_500_000)).toBe('2.5');
  });

  it('acepta coma o punto y rechaza precisión no representable', () => {
    expect(parseQuantity('0,125')).toBe(125_000);
    expect(parseQuantity('0.125')).toBe(125_000);
    expect(parseQuantity('0.1234567')).toBeNull();
    expect(parseQuantity('-1')).toBeNull();
    expect(parseQuantity('')).toBeNull();
  });

  it('valida el incremento sin redondear', () => {
    expect(onGrid(1_250_000, 250_000)).toBe(true);
    expect(onGrid(1_200_000, 250_000)).toBe(false);
  });
});
