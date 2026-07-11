export interface UnusualMoveDto {
  date: string;
  return_pct: number;
  z_score: number;
}

export interface MarketStatsDto {
  instrument_symbol: string;
  window_days: number;
  last_price: number | null;
  price_delta_pct: number | null;
  volatility_pct: number | null;
  volatility_regime: 'low' | 'normal' | 'elevated' | 'high' | null;
  unusual_moves: UnusualMoveDto[];
  as_of: string;
}
