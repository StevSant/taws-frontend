import { Watchlist } from '../../briefings/domain';
import { RadarSignal } from '../domain';
import { computeMarketScore } from './compute-market-score';
import { computeRadarLandscape } from './compute-radar-landscape';
import { WatchlistSummary } from './watchlist-summary.model';
import { WatchlistSummaryMember } from './watchlist-summary-member.model';

/**
 * Aggregates one watchlist's resolved member cards into a summary for the radar's "Mis listas"
 * strip.
 *
 * `signals` must already contain one entry per watchlist symbol — including symbols the Analyst
 * hasn't scored, which arrive as unclassified cards (see `RadarStore.resolveSignals`). Passing a
 * filtered list would understate `instrumentCount` and inflate the processed %.
 *
 * Reuses `computeRadarLandscape` / `computeMarketScore` so a list's read is derived exactly the
 * same way as the global market read — a list of every instrument scores identically to the radar.
 */
export function computeWatchlistSummary(
  watchlist: Watchlist,
  signals: RadarSignal[],
): WatchlistSummary {
  const landscape = computeRadarLandscape(signals);

  const confidences = signals
    .map((signal) => signal.confidence)
    .filter((confidence): confidence is number => confidence !== undefined);
  const deltas = signals
    .map((signal) => signal.priceDelta)
    .filter((delta): delta is number => delta !== undefined);

  return {
    id: watchlist.id,
    name: watchlist.name,
    instrumentCount: signals.length,
    distribution: landscape.distribution,
    score: computeMarketScore(landscape.distribution, signals.length),
    averageConfidence: mean(confidences),
    averageDeltaPct: mean(deltas),
    members: signals.map((signal): WatchlistSummaryMember => ({
      symbol: signal.symbol,
      name: signal.instrument?.name,
      impactClass: signal.impactClass,
      deltaPct: signal.priceDelta,
    })),
  };
}

/** `undefined` for an empty set — an absent reading, never a fabricated `0`. */
function mean(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}
