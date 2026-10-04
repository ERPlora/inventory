// inventory#130: the Movements list printed «30/09/2026, 00:35» (118 px in Spanish, 143 px with the
// English «AM») in a column a tablet gives 88 px, so the time was cut off. A list column prints the
// short instant the Cash grid already uses (cash_register#127, Shopify «Sep 30 at 11:45 pm»): this
// year's movements without the year. An older movement keeps its full date AND its time: the stock
// ledger has no detail screen where that time could be read otherwise.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatListDateTime, splitListDateTime } from './list-date';

afterEach(() => vi.useRealTimers());

const NOW = new Date('2026-10-01T10:00:00');

describe('formatListDateTime (inventory#130)', () => {
  it('prints day, month and time for a movement of the current year, without the year', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    const value = '2026-09-30T08:05:13.093240004+00:00';
    const shown = formatListDateTime(value, 'es');
    expect(shown).toBe(
      new Intl.DateTimeFormat('es', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })
        .format(new Date('2026-09-30T08:05:13Z')),
    );
    expect(shown).not.toContain('2026');
    expect(shown).toMatch(/\d{2}:\d{2}/);
  });

  it('keeps the date and the time for a movement of another year, with a short year (inventory#139)', () => {
    // «31/12/2025, 23:45» is 118 px in Spanish and the tablet column holds about 108: the time was
    // cut again. The short year is the convention of a compact list (Gmail, Outlook «12/31/25»).
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    expect(formatListDateTime(new Date(2025, 11, 31, 23, 45).toISOString(), 'es')).toBe('31/12/25, 23:45');
    expect(formatListDateTime(new Date(2025, 0, 2, 8, 5).toISOString(), 'es')).toBe('02/01/25, 08:05');
    const en = formatListDateTime(new Date(2025, 11, 31, 23, 45).toISOString(), 'en');
    expect(en).toMatch(/^12\/31\/25, 11:45\s?PM$/);
    expect(en).not.toContain('2025');
  });

  it('the current year is read from the clock: in January a December movement shows its year', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2027-01-02T10:00:00'));
    expect(formatListDateTime(new Date(2026, 11, 31, 8, 5).toISOString(), 'es')).toBe('31/12/26, 08:05');
    expect(formatListDateTime(new Date(2027, 0, 1, 8, 5).toISOString(), 'es')).toBe('1/1, 08:05');
  });

  it('follows the hub language: English puts the month first', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    expect(formatListDateTime('2026-09-30T12:00:00Z', 'en')).toMatch(/^9\/30,/);
    expect(formatListDateTime('2026-09-30T12:00:00Z', 'es')).toMatch(/^30\/9,/);
  });

  it('never prints Invalid Date: empty stays empty, garbage and an unknown locale keep the value readable', () => {
    expect(formatListDateTime(null, 'es')).toBe('');
    expect(formatListDateTime('', 'es')).toBe('');
    expect(formatListDateTime('not-a-date', 'es')).toBe('not-a-date');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    // Intl throws RangeError on a malformed tag: the date falls back to Spanish, never to the ISO.
    expect(formatListDateTime('2026-09-30T12:00:00Z', 'xx-invalid-!!')).toMatch(/^30\/9,/);
    expect(formatListDateTime('2026-09-30T12:00:00Z', '')).toMatch(/^30\/9,/);
  });
});

describe('splitListDateTime (inventory#139)', () => {
  // The list cell lets the time drop under the date when the column is too narrow for both (an
  // older movement in English, «12/31/25, 11:45 PM», is wider than a tablet column), instead of
  // cutting it: the pieces must join back into exactly what formatListDateTime prints.
  it('splits the instant into its date and its time, and they join back into the formatted text', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    for (const locale of ['es', 'en']) {
      for (const value of [new Date(2025, 11, 31, 23, 45).toISOString(), '2026-09-30T08:05:13Z']) {
        const parts = splitListDateTime(value, locale);
        expect(parts, `${locale} ${value}`).not.toBeNull();
        expect(parts!.date + parts!.separator + parts!.time).toBe(formatListDateTime(value, locale));
        expect(parts!.time).toMatch(/^\d{1,2}:\d{2}/);
        expect(parts!.date).not.toMatch(/:/);
      }
    }
    expect(splitListDateTime(new Date(2025, 11, 31, 23, 45).toISOString(), 'es'))
      .toEqual({ date: '31/12/25', separator: ', ', time: '23:45' });
  });

  it('a value that is not a date has nothing to split', () => {
    expect(splitListDateTime(null, 'es')).toBeNull();
    expect(splitListDateTime('', 'es')).toBeNull();
    expect(splitListDateTime('not-a-date', 'es')).toBeNull();
  });
});
