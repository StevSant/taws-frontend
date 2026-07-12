export type ChartRequestKind =
  | 'price_candlestick'
  | 'price_line'
  | 'comparison'
  | 'macro'
  | 'drawdown'
  | 'distribution'
  | 'sentiment_gauge';

/** Params that produced a chart, echoed in ChartMeta so a timeframe toggle can re-issue it. */
export interface ChartRequest {
  kind: ChartRequestKind;
  symbols: string[];
  timeframe: string;
}
