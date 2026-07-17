import { SignalImpact } from './signal-impact.model';

/**
 * A human-readable, resolved reference to a signal that backs a briefing.
 * Mirrors one entry of `BriefingResponse.linked_signals` (the enriched
 * evidence contract that supersedes raw `linkedSignalIds` for display).
 *
 * Graceful degradation (three backend flavors):
 * - Fully resolved: real `symbol`/`impact`, `confidence > 0`, non-empty `title`.
 * - Archived (signal pruned, symbol recovered): real `symbol`, but
 *   `impact === 'uncertain'`, `confidence === 0`, empty `title` — the card
 *   keeps the radar link and hides the confidence/impact affordances.
 * - Unresolved: `symbol === '—'`, `impact === 'uncertain'`, `confidence === 0`,
 *   empty `title` — rendered as a de-emphasized, non-link chip.
 */
export interface LinkedSignal {
  signalId: string;
  symbol: string;
  impact: SignalImpact;
  /** Model confidence in the impact call, 0..1. */
  confidence: number;
  title: string;
}
