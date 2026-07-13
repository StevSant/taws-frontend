import { AssetClass } from '../domain';
import { VolatilityRegimeLevel } from '../domain';
import { SignalDto } from './signal-dto';

/** Wire shape of `EnrichedInstrumentResponse` (`GET /api/v1/instruments/enriched`). */
export interface EnrichedInstrumentDto {
  symbol: string;
  name: string;
  asset_class: AssetClass;
  currency: string;
  last_price: number | null;
  price_delta_pct: number | null;
  volatility_pct: number | null;
  volatility_regime: VolatilityRegimeLevel | null;
  sparkline: number[];
  latest_signal: SignalDto | null;
  /**
   * Enrichment fields (Slice 3b, issue #instruments-catalog). Additive —
   * absent on responses from a backend predating them, so the mapper treats
   * `undefined` the same as an explicit `null`.
   */
  market_cap?: number | null;
  volume_24h?: number | null;
  change_7d_pct?: number | null;
}

/** Wire shape of `InstrumentHighlightsResponse`. */
export interface InstrumentHighlightsDto {
  top_gainers: EnrichedInstrumentDto[];
  top_losers: EnrichedInstrumentDto[];
  most_volatile: EnrichedInstrumentDto[];
  trending: EnrichedInstrumentDto[];
}

/** Wire shape of `InstrumentPageResponse`. */
export interface InstrumentPageDto {
  items: EnrichedInstrumentDto[];
  total: number;
  page: number;
  page_size: number;
  highlights: InstrumentHighlightsDto;
}
