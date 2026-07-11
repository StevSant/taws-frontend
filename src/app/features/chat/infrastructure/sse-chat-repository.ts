import { Injectable } from '@angular/core';
import { AppConfigService } from '../../../core';
import { AgentTrace, ChatRepository, ChatStreamEvent } from '../domain';

const CHAT_STREAM_PATH = '/api/v1/chat/stream';
const SSE_DATA_PREFIX = 'data:';

/** Shape of a decoded SSE-v2 frame's JSON payload — see backend `chat.py`'s `_to_sse`. */
interface ChatStreamFrame {
  t?: string;
  trace?: AgentTrace;
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
  constructor(private readonly config: AppConfigService) {
    super();
  }

  async *streamReply(input: string): AsyncIterable<ChatStreamEvent> {
    const response = await fetch(`${this.config.apiBaseUrl}${CHAT_STREAM_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input }),
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
          if (frame.t !== undefined) {
            yield { kind: 'token', text: frame.t };
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
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
