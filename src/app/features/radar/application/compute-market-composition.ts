import { AssetClass, ImpactClass } from '../domain';
import { AssetClassSegment } from './compute-asset-class-segments';
import { MarketScore } from './compute-market-score';

/** One asset class's contribution to the overall universe. */
export interface MarketCompositionEntry {
  assetClass: AssetClass;
  instrumentCount: number;
  newsCount: number;
  /** Share of the total tracked universe, 0–100. */
  sharePct: number;
  marketScore: MarketScore;
  dominantImpact: ImpactClass | 'unclassified' | null;
}

/**
 * Composition view of the whole radar universe: instead of a single blended
 * score, it reports how each asset class contributes (its share of instruments)
 * alongside that class's own market score. This is the "global overview" the
 * dashboard keeps — a breakdown by class, never a flat average across classes.
 */
export interface MarketComposition {
  totalInstruments: number;
  classifiedInstruments: number;
  /** Signals with no known asset class (instrument outside the loaded universe). */
  unclassifiedInstruments: number;
  entries: MarketCompositionEntry[];
}

/**
 * Builds the composition overview from the per-class segments and the total
 * number of tracked signals. `totalInstruments` is the full signal count
 * (including class-less signals) so the shares reflect the real universe and
 * the unclassified residual is surfaced rather than silently dropped.
 */
export function computeMarketComposition(
  segments: AssetClassSegment[],
  totalInstruments: number,
): MarketComposition {
  const classifiedInstruments = segments.reduce((sum, segment) => sum + segment.signals.length, 0);

  const entries: MarketCompositionEntry[] = segments.map((segment) => ({
    assetClass: segment.assetClass,
    instrumentCount: segment.signals.length,
    newsCount: segment.landscape.totalNewsItems,
    sharePct: totalInstruments > 0 ? (segment.signals.length / totalInstruments) * 100 : 0,
    marketScore: segment.marketScore,
    dominantImpact: segment.landscape.assetClasses[0]?.dominantImpact ?? null,
  }));

  return {
    totalInstruments,
    classifiedInstruments,
    unclassifiedInstruments: Math.max(0, totalInstruments - classifiedInstruments),
    entries,
  };
}
