import { ReviewDecision, ReviewState } from '../../briefings/domain';

/**
 * Domain port for compliance reviews on individual Analyst signals (HU3).
 * Briefing reviews live on `ReviewRepository` in the briefings feature.
 */
export abstract class SignalReviewRepository {
  abstract listSignalReviews(signalId: string): Promise<ReviewState[]>;

  abstract submitSignalReview(
    signalId: string,
    decision: ReviewDecision,
    justification: string,
  ): Promise<ReviewState>;
}
