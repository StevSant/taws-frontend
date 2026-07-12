/**
 * One instrument entity identified within a news article. Mirrors
 * `NewsEntityResponse` — populated only for enrichment-capable sources
 * (currently Marketaux); `matchScore`/`sentimentScore` are `undefined` when
 * the upstream provider didn't supply them (never defaulted to a misleading
 * value like `0`).
 */
export interface NewsEntity {
  symbol: string;
  name: string;
  entityType: string;
  industry?: string;
  matchScore?: number;
  sentimentScore?: number;
}
