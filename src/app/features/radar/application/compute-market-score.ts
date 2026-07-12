import { ImpactClass } from '../domain';
import { ImpactDistributionSlice } from './compute-radar-landscape';

export type MarketScoreLabel = 'bullish' | 'bearish' | 'neutral';

export interface MarketScore {
  score: number;
  label: MarketScoreLabel;
  processedPct: number;
  classifiedCount: number;
  totalCount: number;
}

const IMPACT_WEIGHT: Record<ImpactClass, number> = {
  positive: 1,
  negative: -1,
  neutral: 0,
  uncertain: -0.15,
};

/** Derives a 0–100 market score and processed % from impact distribution. */
export function computeMarketScore(
  distribution: ImpactDistributionSlice[],
  totalInstruments: number,
): MarketScore {
  if (totalInstruments === 0) {
    return { score: 50, label: 'neutral', processedPct: 0, classifiedCount: 0, totalCount: 0 };
  }

  let classifiedCount = 0;
  let weightedSum = 0;

  for (const slice of distribution) {
    if (slice.key === 'unclassified') {
      continue;
    }
    classifiedCount += slice.count;
    weightedSum += IMPACT_WEIGHT[slice.key] * slice.count;
  }

  const processedPct = Math.round((classifiedCount / totalInstruments) * 100);
  if (classifiedCount === 0) {
    return {
      score: 50,
      label: 'neutral',
      processedPct,
      classifiedCount,
      totalCount: totalInstruments,
    };
  }

  const avg = weightedSum / classifiedCount;
  const score = Math.round(Math.min(100, Math.max(0, 50 + avg * 50)));
  const label: MarketScoreLabel = score >= 60 ? 'bullish' : score <= 40 ? 'bearish' : 'neutral';

  return { score, label, processedPct, classifiedCount, totalCount: totalInstruments };
}
