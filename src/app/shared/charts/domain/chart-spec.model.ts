import { ChartRequest } from './chart-request.model';

export type ChartType =
  | 'line'
  | 'candlestick'
  | 'comparison'
  | 'area'
  | 'distribution'
  | 'drawdown'
  | 'gauge'
  | 'bar'
  | 'heatmap';

export interface ChartPoint {
  x: string | number;
  y: number;
}

/** One labeled tile in a `heatmap` chart (e.g. a watchlist symbol and its % change). */
export interface ChartCell {
  label: string;
  value: number;
}

export interface OhlcBar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number | null;
}

export interface ChartSeries {
  name: string;
  points: ChartPoint[];
  bars: OhlcBar[];
}

export interface ChartAxis {
  label: string;
  type: 'time' | 'category' | 'value';
  format?: 'currency' | 'percent' | 'number' | null;
}

export interface ChartMeta {
  title: string;
  subtitle?: string | null;
  source: string;
  symbol?: string | null;
  timeframe: string;
  timeframes: string[];
  request: ChartRequest;
}

/**
 * Library-agnostic chart description streamed from the backend (see backend
 * `serialize_chart_spec`). Matches the wire JSON verbatim — no DTO mapping needed.
 */
export interface ChartSpec {
  type: ChartType;
  series: ChartSeries[];
  xAxis: ChartAxis;
  yAxis: ChartAxis;
  meta: ChartMeta;
  /** Labeled tiles for a `heatmap` chart; absent for series-based chart types. */
  cells?: ChartCell[];
}
