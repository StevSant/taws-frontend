/** Fixed formatting locale so prices read consistently regardless of UI language. */
const PRICE_LOCALE = 'en-US';

/**
 * Single source of truth for price/amount formatting across the app: grouped
 * thousands with a fixed number of fraction digits (2 by default). Returns an
 * em dash for missing values so callers never render `NaN`/`undefined`.
 */
export function formatPrice(value: number | null | undefined, fractionDigits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }

  return new Intl.NumberFormat(PRICE_LOCALE, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
