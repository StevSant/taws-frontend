export type ChatRole = 'user' | 'assistant';

/**
 * A single message in a chat thread. `pending` marks an assistant message
 * that is still receiving streamed tokens.
 */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  pending?: boolean;
}
