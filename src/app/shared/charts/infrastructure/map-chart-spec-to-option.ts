import type { EChartsOption } from 'echarts';
import { ChartSpec } from '../domain/chart-spec.model';
import { createTimeAxisFormatter } from './create-time-axis-formatter';
import { ChartTheme } from './read-chart-theme';

/**
 * Map a library-agnostic `ChartSpec` to an ECharts option. This is the ONLY file in the
 * app that knows ECharts option shapes — every other layer speaks `ChartSpec`. Phase 1
 * handles `candlestick` and `line`; Phase 2 extends with `comparison`, `distribution`,
 * `drawdown`, and `gauge`.
 *
 * `locale` drives the shared date-axis formatter so every date-bearing axis renders
 * locale-formatted labels (`29 jun`) instead of raw ISO timestamps.
 */
export function mapChartSpecToOption(
  spec: ChartSpec,
  theme: ChartTheme,
  locale: string,
): EChartsOption {
  const base: EChartsOption = {
    backgroundColor: 'transparent',
    title: {
      text: spec.meta.title,
      textStyle: { color: theme.textPrimary, fontSize: 14 },
    },
    // `cross` gives an interactive crosshair with both axis pointers + value labels.
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    grid: { left: 56, right: 20, top: 44, bottom: 40 },
    textStyle: { color: theme.textSecondary },
  };

  const formatDate = createTimeAxisFormatter(locale);

  switch (spec.type) {
    case 'candlestick': {
      const option = candlestickOption(spec, theme, formatDate);
      // Only add the date-zoom controls when there is real series data (skip the empty spec).
      return option.series
        ? { ...base, ...option, ...dateZoomLayout(theme) }
        : { ...base, ...option };
    }
    case 'line':
    case 'area':
      return { ...base, ...lineOption(spec, theme, formatDate) };
    case 'comparison':
      return { ...base, ...comparisonOption(spec, theme, formatDate) };
    case 'distribution':
      return { ...base, ...distributionOption(spec, theme) };
    case 'drawdown':
      return { ...base, ...drawdownOption(spec, theme, formatDate) };
    case 'gauge':
      return gaugeOption(spec, theme);
    default:
      // Unhandled type until a later phase — render an empty axis rather than crash.
      return base;
  }
}

/** Shared `axisLabel.formatter` type for the date axes below. */
type DateAxisFormatter = (value: string | number) => string;

/**
 * Fraction of the plot height the volume bars occupy at the bottom. The volume value axis is
 * given a `max` of `peakVolume / VOLUME_PLOT_FRACTION`, so the tallest bar fills this fraction
 * and the rest sits above, keeping the candles readable.
 */
const VOLUME_PLOT_FRACTION = 0.28;

/**
 * Interactive date-zoom for the price chart: mouse-wheel / drag zoom inside the plot plus a
 * draggable range slider below, both bound to the shared category x-axis. Lets the user zoom
 * into any sub-window of the loaded series and the price y-axis rescales to that window. The
 * grid gets extra bottom room so the slider doesn't collide with the date labels.
 */
function dateZoomLayout(theme: ChartTheme): Pick<EChartsOption, 'grid' | 'dataZoom'> {
  return {
    grid: { left: 56, right: 20, top: 44, bottom: 64 },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0 },
      {
        type: 'slider',
        xAxisIndex: 0,
        height: 16,
        bottom: 8,
        borderColor: theme.grid,
        fillerColor: 'rgba(232, 181, 48, 0.12)',
        handleStyle: { color: theme.gold },
        textStyle: { color: theme.textSecondary },
      },
    ],
  };
}

function candlestickOption(
  spec: ChartSpec,
  theme: ChartTheme,
  formatDate: DateAxisFormatter,
): EChartsOption {
  const series = spec.series[0];
  if (!series) {
    return {};
  }
  const categories = series.bars.map((bar) => bar.t);
  const flatCandles = series.bars.every(
    (bar) => bar.o === bar.c && bar.h === bar.l && bar.o === bar.h,
  );
  if (flatCandles && series.bars.length > 0) {
    return {
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: theme.grid } },
        axisLabel: { color: theme.textSecondary, formatter: formatDate },
      },
      yAxis: {
        type: 'value',
        scale: true,
        splitLine: { lineStyle: { color: theme.grid, opacity: 0.15 } },
        axisLabel: { color: theme.textSecondary },
      },
      series: [
        {
          type: 'line',
          name: series.name,
          showSymbol: false,
          lineStyle: { color: theme.gold, width: 2 },
          itemStyle: { color: theme.gold },
          data: series.bars.map((bar) => bar.c),
        },
      ],
    };
  }
  const values = series.bars.map((bar) => [bar.o, bar.c, bar.l, bar.h]);
  const hasVolume = series.bars.some((bar) => bar.v !== null && bar.v !== undefined);

  const candlestickSeries = {
    type: 'candlestick' as const,
    name: series.name,
    data: values,
    itemStyle: {
      color: theme.gain,
      color0: theme.loss,
      borderColor: theme.gain,
      borderColor0: theme.loss,
    },
  };

  if (!hasVolume) {
    return {
      xAxis: {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: theme.grid } },
        axisLabel: { color: theme.textSecondary, formatter: formatDate },
      },
      yAxis: {
        type: 'value',
        scale: true,
        splitLine: { lineStyle: { color: theme.grid, opacity: 0.15 } },
      },
      series: [candlestickSeries],
    };
  }

  // Overlay volume as faint bars on a hidden secondary value axis, colored per candle
  // direction (close ≥ open ⇒ gain). Kept on the same grid as the price candles so no
  // extra layout math is needed; the axis `max` pins the bars to the bottom band.
  const peakVolume = Math.max(...series.bars.map((bar) => bar.v ?? 0), 0);
  const volumeData = series.bars.map((bar) => ({
    value: bar.v ?? 0,
    itemStyle: { color: bar.c >= bar.o ? theme.gain : theme.loss, opacity: 0.28 },
  }));

  return {
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: theme.grid } },
      axisLabel: { color: theme.textSecondary, formatter: formatDate },
    },
    yAxis: [
      {
        type: 'value',
        scale: true,
        splitLine: { lineStyle: { color: theme.grid, opacity: 0.15 } },
      },
      {
        type: 'value',
        show: false,
        max: peakVolume > 0 ? peakVolume / VOLUME_PLOT_FRACTION : undefined,
      },
    ],
    series: [
      candlestickSeries,
      {
        type: 'bar',
        name: `${series.name} vol`,
        yAxisIndex: 1,
        data: volumeData,
        barWidth: '60%',
        tooltip: { show: false },
      },
    ],
  };
}

function lineOption(
  spec: ChartSpec,
  theme: ChartTheme,
  formatDate: DateAxisFormatter,
): EChartsOption {
  return {
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: theme.grid } },
      axisLabel: { color: theme.textSecondary, formatter: formatDate },
    },
    yAxis: {
      type: 'value',
      scale: true,
      splitLine: { lineStyle: { color: theme.grid, opacity: 0.15 } },
    },
    series: spec.series.map((series) => ({
      type: 'line',
      name: series.name,
      showSymbol: false,
      areaStyle: spec.type === 'area' ? {} : undefined,
      lineStyle: { color: theme.gold },
      itemStyle: { color: theme.gold },
      data: series.points.map((point) => [point.x, point.y]),
    })),
  };
}

function comparisonOption(
  spec: ChartSpec,
  theme: ChartTheme,
  formatDate: DateAxisFormatter,
): EChartsOption {
  const palette = [theme.gold, theme.gain, theme.loss, theme.textSecondary];
  return {
    legend: { textStyle: { color: theme.textSecondary } },
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: theme.grid } },
      axisLabel: { color: theme.textSecondary, formatter: formatDate },
    },
    yAxis: {
      type: 'value',
      scale: true,
      splitLine: { lineStyle: { color: theme.grid, opacity: 0.15 } },
    },
    series: spec.series.map((series, index) => ({
      type: 'line',
      name: series.name,
      showSymbol: false,
      lineStyle: { color: palette[index % palette.length] },
      itemStyle: { color: palette[index % palette.length] },
      data: series.points.map((point) => [point.x, point.y]),
    })),
  };
}

function distributionOption(spec: ChartSpec, theme: ChartTheme): EChartsOption {
  const series = spec.series[0];
  if (!series) {
    return {};
  }
  const percentAxis =
    spec.yAxis.format === 'percent'
      ? { formatter: (value: number) => `${Math.round(value * 100)}%` }
      : undefined;
  return {
    xAxis: {
      type: 'category',
      data: series.points.map((point) => point.x),
      axisLine: { lineStyle: { color: theme.grid } },
      axisLabel: {
        color: theme.textSecondary,
        interval: 0,
        rotate: series.points.length > 4 ? 24 : 0,
      },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: theme.grid, opacity: 0.15 } },
      axisLabel: { color: theme.textSecondary, ...percentAxis },
    },
    series: [
      {
        type: 'bar',
        name: series.name,
        data: series.points.map((point) => ({
          value: point.y,
          itemStyle: {
            color: point.y > 0 ? theme.gain : point.y < 0 ? theme.loss : theme.textSecondary,
          },
        })),
      },
    ],
  };
}

function drawdownOption(
  spec: ChartSpec,
  theme: ChartTheme,
  formatDate: DateAxisFormatter,
): EChartsOption {
  const series = spec.series[0];
  if (!series) {
    return {};
  }
  return {
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: theme.grid } },
      axisLabel: { color: theme.textSecondary, formatter: formatDate },
    },
    yAxis: {
      type: 'value',
      max: 0,
      splitLine: { lineStyle: { color: theme.grid, opacity: 0.15 } },
    },
    series: [
      {
        type: 'line',
        name: series.name,
        showSymbol: false,
        areaStyle: { color: theme.loss, opacity: 0.2 },
        lineStyle: { color: theme.loss },
        itemStyle: { color: theme.loss },
        data: series.points.map((point) => [point.x, point.y]),
      },
    ],
  };
}

function gaugeOption(spec: ChartSpec, theme: ChartTheme): EChartsOption {
  const point = spec.series[0]?.points[0];
  return {
    backgroundColor: 'transparent',
    title: { text: spec.meta.title, textStyle: { color: theme.textPrimary, fontSize: 14 } },
    series: [
      {
        type: 'gauge',
        min: 0,
        max: 100,
        progress: { show: true },
        axisLine: { lineStyle: { color: [[1, theme.gold]] } },
        detail: { valueAnimation: true, color: theme.textPrimary },
        data: [{ value: point?.y ?? 0, name: String(point?.x ?? '') }],
      },
    ],
  };
}
