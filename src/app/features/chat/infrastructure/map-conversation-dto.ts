import { Conversation } from '../domain';
import { ConversationDto } from './conversation-dto';
import { mapConversationMessagesDto } from './map-conversation-messages-dto';

/** Convert a snake_case `ConversationDto` (with its turns) into the camelCase domain model. */
export function mapConversationDto(dto: ConversationDto): Conversation {
  return {
    id: dto.id,
    title: dto.title,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    messages: mapConversationMessagesDto(dto.messages ?? []),
  };
}
