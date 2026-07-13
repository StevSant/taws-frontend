import { ConversationSummary } from '../domain';
import { ConversationSummaryDto } from './conversation-dto';

/** Convert a snake_case `ConversationSummaryDto` into the camelCase domain model. */
export function mapConversationSummaryDto(dto: ConversationSummaryDto): ConversationSummary {
  return {
    id: dto.id,
    title: dto.title,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}
