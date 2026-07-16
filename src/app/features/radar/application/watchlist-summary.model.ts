import { ImpactDistributionSlice } from './compute-radar-landscape';
import { MarketScore } from './compute-market-score';
import { WatchlistSummaryMember } from './watchlist-summary-member.model';

/**
 * One watchlist reduced to what the radar's "Mis listas" strip shows: the Analyst's read on the
 * list plus an equal-weight price move.
 *
 * `averageDeltaPct` is the **equal-weight mean** of its members' price moves, not a portfolio
 * return: `WatchlistItem` carries no quantity or weight, so no position-weighted figure is
 * computable. The UI must label it as an average — presenting it bare would imply a return the
 * app cannot produce.
 *
 * `averageConfidence` / `averageDeltaPct` are `undefined` (never `0`) when no member carries the
 * underlying value. Read `score.classifiedCount === 0` to tell "the Analyst scored nothing here"
 * apart from a genuine neutral reading — `computeMarketScore` returns a neutral 50 for both.
 */
export interface WatchlistSummary {
  id: string;
  name: string;
  /** Members resolved from the list's items — one per symbol, including unscored ones. */
  instrumentCount: number;
  /** Signal mix across members, including the `unclassified` bucket. */
  distribution: ImpactDistributionSlice[];
  score: MarketScore;
  /** Mean Analyst confidence across scored members (0–1). */
  averageConfidence?: number;
  /** Equal-weight mean price move across members that have one. */
  averageDeltaPct?: number;
  members: WatchlistSummaryMember[];
}
