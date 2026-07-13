import { ChatMessage } from '../domain';
import { ConversationMessageDto } from './conversation-dto';
import { mapChatCitationDto } from './map-chat-citation-dto';

/**
 * Convert the persisted turns of a conversation into renderable domain messages.
 *
 * `system` turns are dropped — they are agent plumbing the transcript never shows. The
 * backend does not store a per-message id (a turn is only ever addressed as part of its
 * conversation), so one is minted here for the `@for` track and for the TTS/playback keys
 * the presentation layer builds from `ChatMessage.id`.
 *
 * `charts` are carried through when present, so a reopened thread (or a full reload) re-renders
 * the charts the assistant drew, matching the live SSE experience.
 */
export function mapConversationMessagesDto(dtos: readonly ConversationMessageDto[]): ChatMessage[] {
  return dtos
    .filter((dto) => dto.role === 'user' || dto.role === 'assistant')
    .map((dto) => ({
      id: nextMessageId(),
      role: dto.role as ChatMessage['role'],
      content: dto.content,
      pending: false,
      ...(dto.charts?.length ? { charts: dto.charts } : {}),
      ...(dto.citations?.length ? { citations: dto.citations.map(mapChatCitationDto) } : {}),
    }));
}

function nextMessageId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}
