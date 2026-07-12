import type { EChartsOption } from 'echarts';
import { ChartSpec } from '../domain/chart-spec.model';
import { ChartTheme } from './read-chart-theme';

/**
 * Map a library-agnostic `ChartSpec` to an ECharts option. This is the ONLY file in the
 * app that knows ECharts option shapes — every other layer speaks `ChartSpec`. Phase 1
 * handles `candlestick` and `line`; Phase 2 extends with `comparison`, `distribution`,
 * `drawdown`, and `gauge`.
 */
export function mapChartSpecToOption(spec: ChartSpec, theme: ChartTheme): EChartsOption {
  const base: EChartsOption = {
    backgroundColor: 'transparent',
    title: {
      text: spec.meta.title,
      textStyle: { color: theme.textPrimary, fontSize: 14 },
    },
    tooltip: { trigger: 'axis' },
    grid: { left: 56, right: 20, top: 44, bottom: 40 },
    textStyle: { color: theme.textSecondary },
  };

  switch (spec.type) {
    case 'candlestick':
      return { ...base, ...candlestickOption(spec, theme) };
    case 'line':
    case 'area':
      return { ...base, ...lineOption(spec, theme) };
    case 'comparison':
      return { ...base, ...comparisonOption(spec, theme) };
    case 'distribution':
      return { ...base, ...distributionOption(spec, theme) };
    case 'drawdown':
      return { ...base, ...drawdownOption(spec, theme) };
    case 'gauge':
      return gaugeOption(spec, theme);
    default:
      // Unhandled type until a later phase — render an empty axis rather than crash.
      return base;
  }
}

function candlestickOption(spec: ChartSpec, theme: ChartTheme): EChartsOption {
  const series = spec.series[0];
  if (!series) {
    return {};
  }
  const categories = series.bars.map((bar) => bar.t);
  const values = series.bars.map((bar) => [bar.o, bar.c, bar.l, bar.h]);
  return {
    xAxis: { type: 'category', data: categories, axisLine: { lineStyle: { color: theme.grid } } },
    yAxis: {
      type: 'value',
      scale: true,
      splitLine: { lineStyle: { color: theme.grid, opacity: 0.15 } },
    },
    series: [
      {
        type: 'candlestick',
        name: series.name,
        data: values,
        itemStyle: {
          color: theme.gain,
          color0: theme.loss,
          borderColor: theme.gain,
          borderColor0: theme.loss,
        },
      },
    ],
  };
}

function lineOption(spec: ChartSpec, theme: ChartTheme): EChartsOption {
  return {
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: theme.grid } },
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

function comparisonOption(spec: ChartSpec, theme: ChartTheme): EChartsOption {
  const palette = [theme.gold, theme.gain, theme.loss, theme.textSecondary];
  return {
    legend: { textStyle: { color: theme.textSecondary } },
    xAxis: { type: 'time', axisLine: { lineStyle: { color: theme.grid } } },
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
  return {
    xAxis: {
      type: 'category',
      data: series.points.map((point) => point.x),
      axisLine: { lineStyle: { color: theme.grid } },
    },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: theme.grid, opacity: 0.15 } } },
    series: [
      {
        type: 'bar',
        name: series.name,
        itemStyle: { color: theme.gold },
        data: series.points.map((point) => point.y),
      },
    ],
  };
}

function drawdownOption(spec: ChartSpec, theme: ChartTheme): EChartsOption {
  const series = spec.series[0];
  if (!series) {
    return {};
  }
  return {
    xAxis: { type: 'time', axisLine: { lineStyle: { color: theme.grid } } },
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
