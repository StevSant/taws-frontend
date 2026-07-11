import { ReviewState } from '../domain';
import { ReviewStateDto } from './review-state-dto';

/** Maps a `ReviewStateDto` (snake_case wire shape) to the domain `ReviewState`. */
export function mapReviewStateDto(dto: ReviewStateDto): ReviewState {
  return {
    id: dto.id,
    entityType: dto.entity_type,
    entityId: dto.entity_id,
    userId: dto.user_id,
    decision: dto.decision,
    justification: dto.justification,
    createdAt: dto.created_at,
  };
}
