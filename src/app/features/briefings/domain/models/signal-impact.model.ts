/**
 * A linked signal's impact classification, as surfaced on an enriched
 * briefing (`BriefingResponse.linked_signals[].impact`). Mirrors the backend's
 * signal impact-class values; kept as a local briefings-domain type so this
 * feature never imports from `features/radar`. `'uncertain'` is also the
 * normalization target for any unknown/unresolved impact string.
 */
export type SignalImpact = 'positive' | 'negative' | 'neutral' | 'uncertain';
