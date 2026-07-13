import { ChatMessage } from './chat-message.model';

/**
 * One chat thread as the sessions sidebar renders it — the view model `ChatSessionsStore`
 * keeps in signals. It mirrors a server-side `Conversation` (same id, which is also the
 * `thread_id` the stream endpoint persists turns against) with two rendering affordances:
 *
 * - `title` is never null: an untitled thread carries the `__new__` sentinel, which the
 *   sidebar renders as the localized "New chat" label.
 * - `messages` is empty until the thread is opened and its transcript is fetched — the
 *   list endpoint deliberately ships no turns.
 */
export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}
