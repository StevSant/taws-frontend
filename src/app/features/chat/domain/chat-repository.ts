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
   * Sends `input` to the backend and yields assistant reply tokens as they
   * arrive over the stream.
   */
  abstract streamReply(input: string): AsyncIterable<string>;
}
