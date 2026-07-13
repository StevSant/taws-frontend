import { LinkedSignal } from './linked-signal.model';

/**
 * An Advisor-generated briefing for one watchlist (HU3). Mirrors
 * `BriefingResponse` (`GET/POST /api/v1/watchlists/{id}/briefings`).
 * Alert/task-shaped only: `summary` and `disclaimer` are prose, and the
 * linked-signal fields reference evidence — there is no order/quantity/price
 * field anywhere on this entity.
 */
export interface Briefing {
  id: string;
  watchlistId: string;
  summary: string;
  disclaimer: string;
  /**
   * Raw evidence ids, kept for back-compat and as the fallback the card renders
   * when `linkedSignals` is empty (older/edge responses).
   */
  linkedSignalIds: string[];
  /**
   * Resolved, human-readable evidence (symbol/impact/confidence/title) — the
   * enriched contract the card renders as in-app links. Empty when the backend
   * predates enrichment; the card then falls back to `linkedSignalIds`.
   */
  linkedSignals: LinkedSignal[];
  /** ISO-8601 timestamp, as returned by the API. */
  createdAt: string;
}
