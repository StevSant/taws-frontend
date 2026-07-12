import { ChartSpec } from '../domain/chart-spec.model';
import { OhlcBar } from '../domain/chart-spec.model';

/** Timeframe label shown on the static candlestick; this spec is not re-requestable. */
const STATIC_TIMEFRAME = 'recent';

/**
 * Build a minimal candlestick `ChartSpec` from an instrument's OHLC candles so the shared
 * `ChartComponent` can render them without hitting the backend. Pure — no side effects.
 *
 * The resulting chart is static: `meta.timeframes` is empty so the shared component renders no
 * timeframe buttons and never re-requests via `ChartRepository`. Used both by the radar signal
 * card and as the anonymous/offline fallback for the asset detail chart (the interactive
 * `POST /api/v1/charts/render` path is auth-guarded, so unauthenticated views fall back to the
 * quant candles already fetched from the public `GET /api/v1/quant/stats`).
 */
export function buildCandlestickSpec(symbol: string, candles: OhlcBar[]): ChartSpec {
  return {
    type: 'candlestick',
    series: [{ name: symbol, points: [], bars: candles }],
    xAxis: { label: '', type: 'time' },
    yAxis: { label: '', type: 'value', format: 'currency' },
    meta: {
      title: '',
      source: 'quant-stats',
      symbol,
      timeframe: STATIC_TIMEFRAME,
      timeframes: [],
      request: { kind: 'price_candlestick', symbols: [symbol], timeframe: STATIC_TIMEFRAME },
    },
  };
}
