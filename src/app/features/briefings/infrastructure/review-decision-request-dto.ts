import { ReviewDecision } from '../domain';

/** Wire shape of `ReviewDecisionRequest`, the body for `POST .../reviews`. */
export interface ReviewDecisionRequestDto {
  decision: ReviewDecision;
  justification: string;
}
