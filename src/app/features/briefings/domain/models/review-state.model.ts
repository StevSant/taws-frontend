import { ReviewDecision } from './review-decision.model';

/**
 * One reviewer decision on a signal or briefing — an immutable audit trail
 * entry. Mirrors `ReviewStateResponse`. Rows are append-only: re-reviewing an
 * entity adds a new `ReviewState` rather than mutating a prior one.
 */
export interface ReviewState {
  id: string;
  entityType: 'signal' | 'briefing';
  entityId: string;
  userId: string;
  decision: ReviewDecision;
  justification: string;
  /** ISO-8601 timestamp, as returned by the API. */
  createdAt: string;
}
