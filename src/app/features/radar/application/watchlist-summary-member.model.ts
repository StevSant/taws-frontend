import { ImpactClass } from '../domain';

/**
 * One instrument inside a watchlist, reduced to what a summary card shows.
 *
 * `impactClass` and `deltaPct` stay `undefined` when the Analyst hasn't scored the instrument
 * or no quant stats exist for it — never `0`, which the card would otherwise render as a real
 * "flat / neutral" reading. Mirrors the same convention on `RadarSignal`.
 */
export interface WatchlistSummaryMember {
  symbol: string;
  /** Instrument display name; `undefined` for a symbol outside the loaded universe. */
  name?: string;
  impactClass?: ImpactClass;
  deltaPct?: number;
}
