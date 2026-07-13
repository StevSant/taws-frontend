import { Injectable, inject } from '@angular/core';
import { AppConfigService, AuthTokenService, TranslationService } from '../../../core';
import { AgentTrace, ChatReference, ChatRepository, ChatStreamEvent, ToolCall } from '../domain';
import { ChartSpec } from '../../../shared/charts';

const CHAT_STREAM_PATH = '/api/v1/chat/stream';
const SSE_DATA_PREFIX = 'data:';

/** Shape of a decoded SSE-v2 frame's JSON payload — see backend `chat.py`'s `_to_sse`. */
interface ChatStreamFrame {
  t?: string;
  trace?: AgentTrace;
  tool?: ToolCall;
  chart?: ChartSpec;
  error?: string;
  done?: boolean;
}

/**
 * Infrastructure adapter for ChatRepository. Calls the backend SSE-v2
 * endpoint with `fetch` and reads the `ReadableStream` body directly (no
 * EventSource, since EventSource can't send a POST body/JSON payload).
 *
 * Parses `data: <json>` lines per the SSE-v2 wire protocol and maps each
 * frame kind to a `ChatStreamEvent`:
 * - `{"t": "<token>"}`       -> `{ kind: 'token', text }`
 * - `{"trace": {...}}`      -> `{ kind: 'trace', trace }` (agent routing trace)
 * - `{"error": "<message>"}` -> `{ kind: 'error', message }`, then the stream ends
 * - `{"done": true}`        -> the stream ends (no event emitted)
 *
 * Bound to ChatRepository in chat-page.component.ts's `providers`.
 */
@Injectable()
export class SseChatRepository extends ChatRepository {
  private readonly config = inject(AppConfigService);
  private readonly authToken = inject(AuthTokenService);
  private readonly translation = inject(TranslationService);

  async *streamReply(
    input: string,
    threadId: string,
    reference?: ChatReference,
  ): AsyncIterable<ChatStreamEvent> {
    const response = await fetch(`${this.config.apiBaseUrl}${CHAT_STREAM_PATH}`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(this.buildBody(input, threadId, reference)),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Chat stream request failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

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
            return;
          }
          if (frame.error !== undefined) {
            yield { kind: 'error', message: frame.error };
            return;
          }
          if (frame.trace !== undefined) {
            yield { kind: 'trace', trace: frame.trace };
            continue;
          }
          if (frame.tool !== undefined) {
            yield { kind: 'tool', tool: frame.tool };
            continue;
          }
          if (frame.chart !== undefined) {
            yield { kind: 'chart', chart: frame.chart };
            continue;
          }
          if (frame.t !== undefined) {
            yield { kind: 'token', text: frame.t };
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
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
