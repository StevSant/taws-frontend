import { ChartSpec, OhlcBar } from '../../../../shared/charts';

/** Timeframe label shown on the compact candlestick; the card chart is not re-requestable. */
const CARD_TIMEFRAME = 'recent';

/**
 * Build a minimal candlestick `ChartSpec` from an instrument's OHLC candles so the shared
 * `ChartComponent` can render them inside a radar signal card. Pure — no side effects.
 *
 * The card chart is static: `meta.timeframes` is empty so the shared component renders no
 * timeframe buttons and never re-requests via `ChartRepository`.
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
      timeframe: CARD_TIMEFRAME,
      timeframes: [],
      request: { kind: 'price_candlestick', symbols: [symbol], timeframe: CARD_TIMEFRAME },
    },
  };
}
