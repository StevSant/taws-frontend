import { ChartSpec } from '../../../shared/charts';
import { ChatCitationDto } from './chat-citation-dto';

/** Wire shape of one conversation in `GET /api/v1/chat/conversations` (snake_case). */
export interface ConversationSummaryDto {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

/** Wire shape of one persisted turn inside a `ConversationDto`. */
export interface ConversationMessageDto {
  role: 'user' | 'assistant' | 'system';
  content: string;
  /**
   * Charts the assistant drew on this turn — already-serialized ChartSpec wire dicts (the same
   * shape the SSE `chart` frame delivers), so they map straight onto `ChatMessage.charts`.
   * Absent for user turns and text-only replies.
   */
  charts?: ChartSpec[];
  citations?: ChatCitationDto[];
}

/** Wire shape of `GET /api/v1/chat/conversations/{id}` — a conversation with its turns. */
export interface ConversationDto extends ConversationSummaryDto {
  messages: ConversationMessageDto[];
}

/** Request body for `POST /api/v1/chat/title`. */
export interface GenerateTitleRequestDto {
  messages: ConversationMessageDto[];
  /** Conversation to persist the generated title onto. */
  thread_id: string;
}

/** Response body of `POST /api/v1/chat/title`. */
export interface ConversationTitleDto {
  title: string;
}
