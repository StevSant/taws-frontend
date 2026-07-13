import { ChatMessage } from './chat-message.model';

/**
 * A full conversation with its turns, as returned by
 * `GET /api/v1/chat/conversations/{id}` — this is what rehydrates a transcript when the
 * user reopens a thread, including on a device that never saw it before.
 *
 * `system` turns the backend may have stored are dropped while mapping: they are agent
 * plumbing, never rendered, so the domain only carries user/assistant `ChatMessage`s.
 */
export interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}
