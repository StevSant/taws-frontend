import { ReviewDecision } from '../domain';

/** Wire shape of `ReviewStateResponse` as returned by the briefing reviews endpoints. */
export interface ReviewStateDto {
  id: string;
  entity_type: 'signal' | 'briefing';
  entity_id: string;
  user_id: string;
  decision: ReviewDecision;
  justification: string;
  created_at: string;
}
