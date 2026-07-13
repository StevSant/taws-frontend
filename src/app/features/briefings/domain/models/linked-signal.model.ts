import { SignalImpact } from './signal-impact.model';

/**
 * A human-readable, resolved reference to a signal that backs a briefing.
 * Mirrors one entry of `BriefingResponse.linked_signals` (the enriched
 * evidence contract that supersedes raw `linkedSignalIds` for display).
 *
 * Graceful degradation: an id the backend could not resolve comes back with
 * `symbol === '—'`, `impact === 'uncertain'`, `confidence === 0`, and an empty
 * `title` — the card renders those as a de-emphasized, non-link chip.
 */
export interface LinkedSignal {
  signalId: string;
  symbol: string;
  impact: SignalImpact;
  /** Model confidence in the impact call, 0..1. */
  confidence: number;
  title: string;
}
