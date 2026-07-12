import { MacroValueFormat } from './macro-indicator-catalog';

/**
 * Format a macro indicator value for display: `percent` appends `%`, `currency` prepends
 * `$` with thousands separators. `null` (empty series) renders as an em dash. Pure.
 */
export function formatMacroValue(value: number | null, format: MacroValueFormat): string {
  if (value === null || !Number.isFinite(value)) {
    return '—';
  }
  if (format === 'percent') {
    return `${value.toFixed(2)}%`;
  }
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

/**
 * Percentage change from the first to the last observation of a series (the period delta
 * shown next to each indicator). Returns `null` when there aren't two usable endpoints.
 */
export function periodChangePct(values: number[]): number | null {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length < 2) {
    return null;
  }
  const first = finite[0];
  const last = finite[finite.length - 1];
  if (first === 0) {
    return null;
  }
  return ((last - first) / Math.abs(first)) * 100;
}
