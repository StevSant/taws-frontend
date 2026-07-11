import { ChatMessage } from './chat-message.model';

/** A persisted chat thread for one user, stored client-side until a list API lands. */
export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}
