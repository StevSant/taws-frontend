/**
 * Single source of truth for percentage-change formatting: a signed, fixed
 * two-decimal percent (e.g. `+1.25%`, `-0.40%`, `0.00%`). Returns an em dash
 * for missing values so callers never render `NaN`/`undefined`.
 */
export function formatPriceDelta(value: number | null | undefined, fractionDigits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }

  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(fractionDigits)}%`;
}
