import { ReviewDecision } from './models/review-decision.model';
import { ReviewState } from './models/review-state.model';

/**
 * Domain port for the briefing review workflow (reviewed/escalated/discarded
 * + required justification). An abstract class so it can double as an
 * Angular DI token — bind the concrete adapter via
 * `{ provide: ReviewRepository, useClass: HttpReviewRepository }`.
 *
 * Deliberately scoped to *briefing* reviews only: the backend's
 * `POST/GET /api/v1/briefings/{id}/reviews` endpoints are ownership-scoped
 * (404 on another user's briefing, via the briefing's watchlist), unlike
 * `POST/GET /api/v1/signals/{id}/reviews` which are global/unowned (signals
 * have no owner). This panel never calls the signal-review endpoints — that
 * belongs to the radar feature if/when it grows a review affordance.
 */
export abstract class ReviewRepository {
  /** Lists the full review audit trail for a briefing, most recent last. */
  abstract listBriefingReviews(briefingId: string): Promise<ReviewState[]>;

  /**
   * Records a review decision on a briefing. `justification` must be
   * non-blank (enforced by the backend schema, mirrored client-side before
   * the request is sent). Escalation is only ever a `ReviewState` row — no
   * execution side effect exists anywhere in this path.
   */
  abstract submitBriefingReview(
    briefingId: string,
    decision: ReviewDecision,
    justification: string,
  ): Promise<ReviewState>;
}
