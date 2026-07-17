import { Injectable, inject } from '@angular/core';
import { AppConfigService, AuthTokenService, TranslationService } from '../../../core';
import { ChatReference, ChatStreamEvent } from '../domain';
import { ChatStreamFrame } from './chat-stream-frame';
import { mapChatStreamFrame } from './map-chat-stream-frame';

const CHAT_STREAM_PATH = '/api/v1/chat/stream';
const SSE_DATA_PREFIX = 'data:';

/**
 * The streaming half of the ChatRepository adapter — composed by `HttpChatRepository`,
 * which is what's bound to the port (the other half, conversation history, is plain JSON
 * over `HttpClient`). Calls the backend SSE-v2 endpoint with `fetch` and reads the
 * `ReadableStream` body directly (no EventSource, since EventSource can't send a POST
 * body/JSON payload).
 *
 * Parses `data: <json>` lines per the SSE-v2 wire protocol and maps each
 * frame kind to a `ChatStreamEvent`:
 * - `{"t": "<token>"}`       -> `{ kind: 'token', text }`
 * - `{"trace": {...}}`      -> `{ kind: 'trace', trace }` (agent routing trace)
 * - `{"error": "<message>"}` -> `{ kind: 'error', message }`, then the stream ends
 * - `{"done": true}`        -> the stream ends (no event emitted)
 *
 * The backend persists both turns of the exchange onto `thread_id` as it streams, so
 * nothing here has to save the transcript.
 */
@Injectable()
export class SseChatRepository {
  private readonly config = inject(AppConfigService);
  private readonly authToken = inject(AuthTokenService);
  private readonly translation = inject(TranslationService);

  async *streamReply(
    input: string,
    threadId: string,
    reference?: ChatReference,
    signal?: AbortSignal,
  ): AsyncIterable<ChatStreamEvent> {
    let response: Response;
    try {
      response = await fetch(`${this.config.apiBaseUrl}${CHAT_STREAM_PATH}`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(this.buildBody(input, threadId, reference)),
        signal,
      });
    } catch (error: unknown) {
      // A caller-initiated abort (component destroyed mid-turn) is not a failure — end
      // the stream silently instead of surfacing an error to the UI.
      if (this.isAbortError(error)) {
        return;
      }
      throw error;
    }

    if (!response.ok || !response.body) {
      throw new Error(`Chat stream request failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    // The backend ALWAYS emits a terminal `{"done": true}` frame last. If the reader ends
    // without one, an intermediary (proxy/edge/idle timeout) cut the body mid-turn, so the
    // reply is truncated — we surface an error below rather than settle it as complete.
    let sawDoneFrame = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const frame = this.parseDataLine(line);
          if (frame === null) {
            continue;
          }

          if (frame.done) {
            // Clean terminal frame — the reply arrived in full, nothing was truncated.
            return;
          }
          const event = mapChatStreamFrame(frame);
          if (event !== null) {
            yield event;
            if (event.kind === 'error') return;
          }
        }
      }

      // Flush the tail: a final frame that arrived without a trailing newline is still
      // sitting in `buffer` when the reader signals done, so its token/event would be
      // dropped without this. A terminal done frame can also land here without a newline.
      const tail = this.parseDataLine(buffer);
      if (tail !== null) {
        if (tail.done) {
          sawDoneFrame = true;
        } else {
          const event = mapChatStreamFrame(tail);
          if (event !== null) {
            yield event;
            if (event.kind === 'error') return;
          }
        }
      }

      // Reached the end of the body without the backend's terminal done frame: the stream was
      // cut short. Emit an error (reusing the existing error event shape) so the store marks the
      // turn as failed instead of presenting the partial reply as a finished answer.
      if (!sawDoneFrame) {
        yield { kind: 'error', message: this.translation.t('errors.network') };
      }
    } catch (error: unknown) {
      if (!this.isAbortError(error)) {
        throw error;
      }
    } finally {
      reader.releaseLock();
    }
  }

  private isAbortError(error: unknown): boolean {
    return (error instanceof DOMException || error instanceof Error) && error.name === 'AbortError';
  }

  /**
   * Builds the request body, adding the optional grounding reference as flat
   * fields the backend expects: an asset reference sends `asset_symbol`, a news
   * reference sends `news_id`. Neither is present when there is no reference.
   *
   * `locale` is the active UI locale (issue #67). Without it the agent's specialist
   * prompts — all authored in English — made it answer in English no matter what the
   * user picked. Sent on every turn, so switching language mid-conversation takes effect
   * on the next message.
   */
  private buildBody(
    input: string,
    threadId: string,
    reference?: ChatReference,
  ): Record<string, string> {
    const body: Record<string, string> = {
      message: input,
      thread_id: threadId,
      locale: this.translation.locale(),
    };
    if (reference?.kind === 'asset') {
      body['asset_symbol'] = reference.symbol;
      if (reference.fromDate && reference.toDate) {
        body['from_date'] = reference.fromDate;
        body['to_date'] = reference.toDate;
      }
    } else if (reference?.kind === 'news') {
      body['news_id'] = reference.newsId;
    }
    return body;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = this.authToken.currentToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private parseDataLine(line: string): ChatStreamFrame | null {
    const trimmed = line.trim();
    if (!trimmed.startsWith(SSE_DATA_PREFIX)) {
      return null;
    }

    const payload = trimmed.slice(SSE_DATA_PREFIX.length).trim();
    if (!payload) {
      return null;
    }

    try {
      return JSON.parse(payload) as ChatStreamFrame;
    } catch {
      return null;
    }
  }
}
