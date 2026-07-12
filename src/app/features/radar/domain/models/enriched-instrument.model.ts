import { AssetClass } from './asset-class.model';
import { VolatilityRegimeLevel } from './market-stats.model';
import { Signal } from './signal.model';

/**
 * One markets-explorer row, already enriched with market + signal data. Mirrors
 * `EnrichedInstrumentResponse` (`GET /api/v1/instruments/enriched`) so the
 * explorer renders a full Binance-style row without fanning out one request per
 * instrument per column. Every market-derived field is nullable and `sparkline`
 * may be empty when the backend price series is too thin — the UI renders a
 * muted "sin datos" state rather than fabricating a value.
 */
export interface EnrichedInstrument {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  currency: string;
  lastPrice: number | null;
  priceDeltaPct: number | null;
  volatilityPct: number | null;
  volatilityRegime: VolatilityRegimeLevel | null;
  /** Downsampled closing prices (oldest → newest). */
  sparkline: number[];
  latestSignal: Signal | null;
}
