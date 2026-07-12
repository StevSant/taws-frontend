import { ChartSpec } from '../../../shared/charts';
import { MacroSeries } from '../domain';

/** Not re-requestable: `meta.timeframes` is empty so the shared chart renders no buttons. */
const STATIC_TIMEFRAME = 'range';

/**
 * Build a static area-line `ChartSpec` from a macro indicator's history so the shared
 * `ChartComponent` (ECharts) can render the full-history detail chart with a native
 * hover crosshair tooltip — no backend chart-render round trip. Pure.
 *
 * Kept minimal (`meta.timeframes: []`) so the chart never tries to re-request via
 * `ChartRepository`; the macro detail page owns range switching by re-fetching the series.
 */
export function buildMacroLineSpec(title: string, series: MacroSeries): ChartSpec {
  return {
    type: 'area',
    series: [
      {
        name: title,
        points: series.observations.map((observation) => ({
          x: observation.asOf.toISOString(),
          y: observation.value,
        })),
        bars: [],
      },
    ],
    xAxis: { label: '', type: 'time' },
    yAxis: { label: '', type: 'value', format: 'number' },
    meta: {
      title: '',
      source: 'macro-series',
      timeframe: STATIC_TIMEFRAME,
      timeframes: [],
      request: { kind: 'macro', symbols: [series.indicator], timeframe: STATIC_TIMEFRAME },
    },
  };
}
