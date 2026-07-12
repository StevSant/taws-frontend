import { ASSET_CLASSES, AssetClass, RadarSignal } from '../domain';
import { RadarLandscape, computeRadarLandscape } from './compute-radar-landscape';
import { MarketScore, computeMarketScore } from './compute-market-score';

/**
 * A single asset class slice of the radar feed with its OWN aggregates. The
 * global dashboard blends every tracked instrument into one pulse/score, which
 * is misleading when the universe mixes crypto, equities, commodities and
 * credit/rates (a crypto rally and a bond selloff cancel out). Segmenting by
 * asset class gives each class an isolated impact distribution and market score
 * so the numbers stay meaningful — see issue #41.
 */
export interface AssetClassSegment {
  assetClass: AssetClass;
  signals: RadarSignal[];
  landscape: RadarLandscape;
  marketScore: MarketScore;
}

/**
 * Groups the current radar signals by their instrument's asset class and
 * computes per-class aggregates. Derived purely from the signals already loaded
 * in `RadarStore` — no refetch. Signals whose instrument (and therefore asset
 * class) is unknown are excluded here; they remain visible in the global feed
 * and are surfaced as the "unclassified" residual in `computeMarketComposition`.
 * Classes with no signals are omitted, and the remaining classes keep the stable
 * `ASSET_CLASSES` display order.
 */
export function computeAssetClassSegments(signals: RadarSignal[]): AssetClassSegment[] {
  const signalsByClass = new Map<AssetClass, RadarSignal[]>();

  for (const signal of signals) {
    const assetClass = signal.instrument?.assetClass;
    if (!assetClass) {
      continue;
    }
    const bucket = signalsByClass.get(assetClass) ?? [];
    bucket.push(signal);
    signalsByClass.set(assetClass, bucket);
  }

  return ASSET_CLASSES.filter((assetClass) => signalsByClass.has(assetClass)).map((assetClass) => {
    const segmentSignals = signalsByClass.get(assetClass) ?? [];
    const landscape = computeRadarLandscape(segmentSignals);
    return {
      assetClass,
      signals: segmentSignals,
      landscape,
      marketScore: computeMarketScore(landscape.distribution, landscape.totalInstruments),
    };
  });
}
