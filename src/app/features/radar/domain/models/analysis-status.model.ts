/**
 * Lifecycle of a persisted news item with respect to Analyst classification.
 * Mirrors the backend `AnalysisStatus` StrEnum.
 *
 * `pending` — not yet looked at. `analyzed` — an LLM classification ran and
 * produced a signal (see `NewsItem.signalId`). `skipped` — deliberately not
 * sent to the LLM (low relevance, duplicate, or no linked instrument).
 */
export type AnalysisStatus = 'pending' | 'analyzed' | 'skipped';
