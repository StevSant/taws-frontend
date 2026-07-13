/**
 * Why a news item produced no Analyst signal. Mirrors the backend `NewsSkipReason`
 * StrEnum (`news_items.skip_reason`).
 *
 * `analysisStatus` alone can't answer "why?" — `skipped` collapses a deliberate cost
 * decision, a duplicate, and an unlinkable article into one opaque state, which is why
 * the detail page could only ever say "No se produjo ninguna señal para esta noticia"
 * (reads as broken, not as an intentional decision) and the timeline showed everything
 * as the same ambiguous "Sin clasificar" tag.
 *
 * Two of these are retryable — the backend leaves those items `pending` and re-attempts
 * them on the next batch run:
 *
 * - `no_linked_instrument` (skipped) — names no instrument in the universe; signals are
 *   generated per instrument, so there is nothing to classify it against. This is the one
 *   state "Analizar ahora" cannot fix, so the button is disabled for it.
 * - `gated_low_relevance` (skipped) — the pre-filter judged it not worth an LLM call.
 *   The user can override that with "Analizar ahora".
 * - `near_duplicate` (skipped) — another article already covers this event.
 * - `compliance_blocked` (skipped) — classification ran but failed the compliance gate.
 * - `insufficient_evidence` (pending, retryable) — too few distinct news sources so far.
 * - `analysis_failed` (pending, retryable) — a transient failure; will be retried.
 */
export type NewsSkipReason =
  | 'no_linked_instrument'
  | 'gated_low_relevance'
  | 'near_duplicate'
  | 'compliance_blocked'
  | 'insufficient_evidence'
  | 'analysis_failed';
