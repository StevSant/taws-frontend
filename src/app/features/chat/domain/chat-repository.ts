import { ChatMessage } from './models/chat-message.model';
import { ChatReference } from './models/chat-reference.model';
import { ChatStreamEvent } from './models/chat-stream-event.model';
import { Conversation } from './models/conversation.model';
import { ConversationSummary } from './models/conversation-summary.model';

/**
 * Domain port for the chat backend: streaming a reply, plus reading and removing the
 * conversations the server persists for the current user. An abstract class (not an
 * interface) so it can double as an Angular DI token — bind the concrete adapter via
 * `{ provide: ChatRepository, useClass: HttpChatRepository }`.
 *
 * Business/application code depends on this abstraction only; it never imports the
 * SSE/HTTP adapters directly.
 */
export abstract class ChatRepository {
  /**
   * Sends `input` to the backend and yields discriminated stream events
   * (assistant tokens, agent routing traces, or a stream-level error) as
   * they arrive over SSE-v2.
   *
   * The backend persists both turns of the exchange (the user message and the assistant
   * reply) onto the conversation named by `threadId`, creating it on the first turn — the
   * caller never has to save the transcript itself.
   *
   * An optional `signal` aborts the in-flight stream (e.g. when the caller is destroyed
   * mid-turn). Adapters that honor it stop cleanly without surfacing an error to the UI.
   */
  abstract streamReply(
    input: string,
    threadId: string,
    reference?: ChatReference,
    signal?: AbortSignal,
  ): AsyncIterable<ChatStreamEvent>;

  /** The current user's conversations, most-recently-updated first. Summaries, no turns. */
  abstract listConversations(): Promise<ConversationSummary[]>;

  /** One conversation the current user owns, with all of its turns in order. */
  abstract getConversation(id: string): Promise<Conversation>;

  /** Permanently removes one conversation the current user owns, and its turns. */
  abstract deleteConversation(id: string): Promise<void>;

  /**
   * Generates a concise topic title for `messages` and SAVES it onto the `threadId`
   * conversation, so the sidebar shows the same title after a reload and on other devices
   * instead of every client re-deriving one from the first message locally.
   */
  abstract generateTitle(messages: readonly ChatMessage[], threadId: string): Promise<string>;

  /**
   * Persists completed realtime/voice turns onto `conversationId` (the id the realtime session
   * minted server-side), so a page refresh rehydrates them via `getConversation`. Only each
   * turn's role and content are sent — charts are not persisted on this path.
   */
  abstract persistRealtimeTurns(
    conversationId: string,
    turns: readonly ChatMessage[],
  ): Promise<void>;
}
