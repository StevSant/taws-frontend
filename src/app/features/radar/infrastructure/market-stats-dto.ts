export interface UnusualMoveDto {
  date: string;
  return_pct: number;
  z_score: number;
}

/** One OHLC candle as sent by the backend (`GET /api/v1/quant/stats`). */
export interface OhlcBarDto {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number | null;
}

export interface MarketStatsDto {
  instrument_symbol: string;
  window_days: number;
  last_price: number | null;
  price_delta_pct: number | null;
  volatility_pct: number | null;
  volatility_regime: 'low' | 'normal' | 'elevated' | 'high' | null;
  unusual_moves: UnusualMoveDto[];
  /** Optional until the backend ships it; oldest → newest. */
  candles?: OhlcBarDto[];
  as_of: string;
}
