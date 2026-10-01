/**
 * An instant for a LIST column, short enough for a tablet (inventory#130): `30/9, 23:45` for this
 * year, `31/12/2025, 23:45` for an older one. Same short form as the Cash grid (cash_register#127;
 * Shopify «Sep 30 at 11:45 pm», Gmail), but an older movement keeps its time: the stock ledger has
 * no detail screen where it could be read otherwise.
 */
export function formatListDateTime(value: unknown, locale: string): string {
  const raw = value == null ? '' : String(value);
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const options: Intl.DateTimeFormatOptions = d.getFullYear() === new Date().getFullYear()
    ? { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  try {
    return new Intl.DateTimeFormat(locale || 'es', options).format(d);
  } catch {
    // A malformed language tag (RangeError) is not a reason to lose the date.
    return new Intl.DateTimeFormat('es', options).format(d);
  }
}
