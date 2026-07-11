import { Injectable } from '@angular/core';
import { AppConfigService } from '../../../core';
import { ChatRepository } from '../domain';

const CHAT_STREAM_PATH = '/api/v1/chat/stream';
const SSE_DATA_PREFIX = 'data:';

/**
 * Infrastructure adapter for ChatRepository. Calls the backend SSE endpoint
 * with `fetch` and reads the `ReadableStream` body directly (no EventSource,
 * since EventSource can't send a POST body/JSON payload).
 *
 * Parses `data: <token>` lines per the SSE wire format and yields the token
 * payloads. Bound to ChatRepository in app.config.ts.
 */
@Injectable()
export class SseChatRepository extends ChatRepository {
  constructor(private readonly config: AppConfigService) {
    super();
  }

  async *streamReply(input: string): AsyncIterable<string> {
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
          const token = this.parseDataLine(line);
          if (token !== null) {
            yield token;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private parseDataLine(line: string): string | null {
    const trimmed = line.trim();
    if (!trimmed.startsWith(SSE_DATA_PREFIX)) {
      return null;
    }
    return trimmed.slice(SSE_DATA_PREFIX.length).trim();
  }
}
