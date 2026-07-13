/**
 * One conversation as listed by `GET /api/v1/chat/conversations` — the shape the sessions
 * sidebar hydrates from. Carries no messages on purpose: the list only needs a title and a
 * timestamp. The turns of a thread arrive with `ChatRepository.getConversation(id)`.
 *
 * `title` is `null` until the backend has generated one for the thread (see
 * `ChatRepository.generateTitle`).
 */
export interface ConversationSummary {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}
