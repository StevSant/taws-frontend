import { ChatReference } from './models/chat-reference.model';
import { ChatStreamEvent } from './models/chat-stream-event.model';

/**
 * Domain port for streaming chat replies. An abstract class (not an
 * interface) so it can double as an Angular DI token — bind the concrete
 * adapter via `{ provide: ChatRepository, useClass: SseChatRepository }`.
 *
 * Business/application code depends on this abstraction only; it never
 * imports the SSE/HTTP adapter directly.
 */
export abstract class ChatRepository {
  /**
   * Sends `input` to the backend and yields discriminated stream events
   * (assistant tokens, agent routing traces, or a stream-level error) as
   * they arrive over SSE-v2.
   */
  abstract streamReply(
    input: string,
    threadId: string,
    reference?: ChatReference,
  ): AsyncIterable<ChatStreamEvent>;
}
