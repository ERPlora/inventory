/**
 * An instant for a LIST column, short enough for a tablet (inventory#130): `30/9, 23:45` for this
 * year, `31/12/25, 23:45` for an older one. Same short form as the Cash grid (cash_register#127;
 * Shopify «Sep 30 at 11:45 pm», Gmail), but an older movement keeps its time: the stock ledger has
 * no detail screen where it could be read otherwise. The older year is short (inventory#139,
 * Gmail/Outlook «12/31/25»): with four digits the time no longer fitted a tablet column.
 */
export function formatListDateTime(value: unknown, locale: string): string {
  const raw = value == null ? '' : String(value);
  if (!raw) return '';
  const parts = listDateTimeParts(raw, locale);
  return parts ? parts.map((p) => p.value).join('') : raw;
}

/** The date, the text between them and the time of {@link formatListDateTime}, which they rebuild
 *  exactly once joined; `null` when the value is not a date. A list cell paints the date and the
 *  time as unbreakable pieces so a narrow column moves the time under the date instead of cutting
 *  it (inventory#139). */
export function splitListDateTime(value: unknown, locale: string): { date: string; separator: string; time: string } | null {
  const raw = value == null ? '' : String(value);
  const parts = raw ? listDateTimeParts(raw, locale) : null;
  if (!parts) return null;
  const hour = parts.findIndex((p) => p.type === 'hour');
  if (hour < 0) return null;
  let lastDateField = hour - 1;
  while (lastDateField >= 0 && !['day', 'month', 'year'].includes(parts[lastDateField].type)) lastDateField -= 1;
  if (lastDateField < 0) return null;
  const text = (from: number, to?: number) => parts.slice(from, to).map((p) => p.value).join('');
  return { date: text(0, lastDateField + 1), separator: text(lastDateField + 1, hour), time: text(hour) };
}

function listDateTimeParts(raw: string, locale: string): Intl.DateTimeFormatPart[] | null {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const options: Intl.DateTimeFormatOptions = d.getFullYear() === new Date().getFullYear()
    ? { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' };
  try {
    return new Intl.DateTimeFormat(locale || 'es', options).formatToParts(d);
  } catch {
    // A malformed language tag (RangeError) is not a reason to lose the date.
    return new Intl.DateTimeFormat('es', options).formatToParts(d);
  }
}
