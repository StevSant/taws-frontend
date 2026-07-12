/**
 * Build a locale-aware `axisLabel.formatter` for chart date axes. Turns a timestamp
 * (ms, as an ECharts `type: 'time'` axis passes it) or an ISO string (as a candlestick
 * `type: 'category'` axis passes it) into a compact, locale-formatted label — never a raw
 * ISO string like `2026-06-29T00:00:00Z`.
 *
 * Granularity adapts to the tick: year-start ticks show the year (`2026`), month-start
 * ticks show month + year (`jun 2026`), everything else shows day + month (`29 jun`).
 * A value that can't be parsed as a date is returned unchanged so a non-date category
 * axis (e.g. asset-class labels) is never mangled.
 *
 * Shared by every date-bearing axis in `map-chart-spec-to-option` (candlestick, line,
 * area, comparison, drawdown) and reused across the chat, asset-detail, signal-card and
 * scenario charts, so no chart ever renders raw ISO timestamps.
 */
export function createTimeAxisFormatter(locale: string): (value: string | number) => string {
  const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const monthYear = new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' });
  const yearOnly = new Intl.DateTimeFormat(locale, { year: 'numeric' });

  return (value: string | number): string => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    if (date.getMonth() === 0 && date.getDate() === 1) {
      return yearOnly.format(date);
    }
    if (date.getDate() === 1) {
      return monthYear.format(date);
    }
    return dayMonth.format(date);
  };
}
