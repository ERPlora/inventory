// inventory#130: the Movements list printed «30/09/2026, 00:35» (118 px in Spanish, 143 px with the
// English «AM») in a column a tablet gives 88 px, so the time was cut off. A list column prints the
// short instant the Cash grid already uses (cash_register#127, Shopify «Sep 30 at 11:45 pm»): this
// year's movements without the year. An older movement keeps its full date AND its time: the stock
// ledger has no detail screen where that time could be read otherwise.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatListDateTime } from './list-date';

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

  it('keeps the full date and the time for a movement of another year', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    const shown = formatListDateTime('2025-12-31T12:00:00+00:00', 'es');
    expect(shown).toMatch(/31\/12\/2025/);
    expect(shown).toMatch(/\d{2}:\d{2}/);
  });

  it('the current year is read from the clock: in January a December movement shows its year', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2027-01-02T10:00:00'));
    expect(formatListDateTime(new Date(2026, 11, 31, 8, 5).toISOString(), 'es')).toBe('31/12/2026, 08:05');
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
