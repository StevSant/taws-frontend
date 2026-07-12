import { MarketStats } from '../domain/models/market-stats.model';
import { MarketStatsDto } from './market-stats-dto';

export function mapMarketStatsDto(dto: MarketStatsDto): MarketStats {
  return {
    instrumentSymbol: dto.instrument_symbol,
    windowDays: dto.window_days,
    lastPrice: dto.last_price,
    priceDeltaPct: dto.price_delta_pct,
    volatilityPct: dto.volatility_pct,
    volatilityRegime: dto.volatility_regime,
    unusualMoves: dto.unusual_moves.map((move) => ({
      date: new Date(move.date),
      returnPct: move.return_pct,
      zScore: move.z_score,
    })),
    candles: (dto.candles ?? []).map((bar) => ({
      t: bar.t,
      o: bar.o,
      h: bar.h,
      l: bar.l,
      c: bar.c,
      v: bar.v ?? null,
    })),
    asOf: new Date(dto.as_of),
  };
}
