import { ImpactClass } from '../../domain';

/** |score| above which a news article is treated as clearly directional rather than neutral. */
const SENTIMENT_THRESHOLD = 0.15;

/**
 * Map a news `sentimentScore` (roughly [-1, 1], populated only by enriching sources such as
 * Marketaux) to the shared `ImpactClass` the impact badge renders — or `null` when no score
 * is available, so a card shows an explicit "unclassified" state instead of a misleading
 * neutral. Pure; no framework dependency.
 */
export function classifyNewsSentiment(score?: number): ImpactClass | null {
  if (score === undefined) {
    return null;
  }
  if (score > SENTIMENT_THRESHOLD) {
    return 'positive';
  }
  if (score < -SENTIMENT_THRESHOLD) {
    return 'negative';
  }
  return 'neutral';
}
