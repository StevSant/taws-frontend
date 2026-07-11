import { UnusualMove } from './unusual-move.model';

export type VolatilityRegimeLevel = 'low' | 'normal' | 'elevated' | 'high';

/** On-demand Quant stats for one instrument (`GET /api/v1/quant/stats`). */
export interface MarketStats {
  instrumentSymbol: string;
  windowDays: number;
  lastPrice: number | null;
  priceDeltaPct: number | null;
  volatilityPct: number | null;
  volatilityRegime: VolatilityRegimeLevel | null;
  unusualMoves: UnusualMove[];
  asOf: Date;
}
