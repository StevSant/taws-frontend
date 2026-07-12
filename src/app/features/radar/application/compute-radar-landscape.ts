import { AssetClass, ImpactClass, RadarSignal } from '../domain';

export interface ImpactDistributionSlice {
  key: ImpactClass | 'unclassified';
  count: number;
}

export interface AssetClassLandscapeCell {
  assetClass: AssetClass;
  count: number;
  dominantImpact: ImpactClass | 'unclassified' | null;
}

export interface RadarLandscape {
  totalInstruments: number;
  totalNewsItems: number;
  distribution: ImpactDistributionSlice[];
  assetClasses: AssetClassLandscapeCell[];
}

const IMPACT_ORDER: (ImpactClass | 'unclassified')[] = [
  'positive',
  'negative',
  'uncertain',
  'neutral',
  'unclassified',
];

/** Aggregates the current radar feed into chart-friendly buckets. */
export function computeRadarLandscape(signals: RadarSignal[]): RadarLandscape {
  const counts = new Map<ImpactClass | 'unclassified', number>(IMPACT_ORDER.map((key) => [key, 0]));

  const assetClassBuckets = new Map<
    AssetClass,
    { count: number; impacts: (ImpactClass | 'unclassified')[] }
  >();

  let totalNewsItems = 0;

  for (const signal of signals) {
    const impact = signal.impactClass ?? 'unclassified';
    counts.set(impact, (counts.get(impact) ?? 0) + 1);
    totalNewsItems += signal.news.length;

    const assetClass = signal.instrument?.assetClass;
    if (!assetClass) {
      continue;
    }

    const bucket = assetClassBuckets.get(assetClass) ?? { count: 0, impacts: [] };
    bucket.count += 1;
    bucket.impacts.push(impact);
    assetClassBuckets.set(assetClass, bucket);
  }

  return {
    totalInstruments: signals.length,
    totalNewsItems,
    distribution: IMPACT_ORDER.map((key) => ({ key, count: counts.get(key) ?? 0 })).filter(
      (slice) => slice.count > 0 || slice.key === 'unclassified',
    ),
    assetClasses: Array.from(assetClassBuckets.entries()).map(([assetClass, bucket]) => ({
      assetClass,
      count: bucket.count,
      dominantImpact: pickDominantImpact(bucket.impacts),
    })),
  };
}

function pickDominantImpact(
  impacts: (ImpactClass | 'unclassified')[],
): ImpactClass | 'unclassified' | null {
  if (impacts.length === 0) {
    return null;
  }

  const tally = new Map<ImpactClass | 'unclassified', number>();
  for (const impact of impacts) {
    tally.set(impact, (tally.get(impact) ?? 0) + 1);
  }

  let winner: ImpactClass | 'unclassified' = impacts[0];
  let best = 0;
  for (const [impact, count] of tally.entries()) {
    if (count > best) {
      winner = impact;
      best = count;
    }
  }
  return winner;
}
