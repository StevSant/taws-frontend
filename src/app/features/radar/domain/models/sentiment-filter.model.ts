/**
 * Sentiment buckets offered by the news browse filter. Mirrors the backend
 * `SentimentFilter` StrEnum.
 *
 * `unclassified` is a real bucket, not an absence: only enrichment-capable sources
 * populate `sentimentScore`, so items without one are honestly "unknown" rather than
 * defaulted to neutral.
 */
export type SentimentFilterOption = 'positive' | 'negative' | 'neutral' | 'unclassified';
