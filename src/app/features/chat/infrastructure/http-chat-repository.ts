import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../core';
import {
  ChatMessage,
  ChatReference,
  ChatRepository,
  ChatStreamEvent,
  Conversation,
  ConversationSummary,
} from '../domain';
import {
  ConversationDto,
  ConversationSummaryDto,
  ConversationTitleDto,
  GenerateTitleRequestDto,
} from './conversation-dto';
import { mapConversationDto } from './map-conversation-dto';
import { mapConversationSummaryDto } from './map-conversation-summary-dto';
import { SseChatRepository } from './sse-chat-repository';

const CONVERSATIONS_PATH = '/api/v1/chat/conversations';
const TITLE_PATH = '/api/v1/chat/title';

/**
 * Infrastructure adapter for `ChatRepository`, and the only class bound to that port.
 *
 * Conversation reads/deletes and title generation are plain JSON calls through
 * `HttpClient` (so `authInterceptor` attaches the bearer token and `authErrorInterceptor`
 * can retry a 401 after a refresh — same as every other `Http*Repository`).
 *
 * Streaming is delegated to `SseChatRepository`: SSE needs a POST body, so it reads the
 * `ReadableStream` from `fetch` directly and can't go through `HttpClient`. Composing the
 * two keeps the SSE parser a single-purpose class while the application layer still sees
 * one port.
 *
 * Bound via `{ provide: ChatRepository, useClass: HttpChatRepository }` in
 * `chat-page.component.ts`.
 */
@Injectable()
export class HttpChatRepository extends ChatRepository {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AppConfigService);
  private readonly stream = inject(SseChatRepository);

  streamReply(
    input: string,
    threadId: string,
    reference?: ChatReference,
    signal?: AbortSignal,
  ): AsyncIterable<ChatStreamEvent> {
    return this.stream.streamReply(input, threadId, reference, signal);
  }

  async listConversations(): Promise<ConversationSummary[]> {
    const dtos = await firstValueFrom(
      this.http.get<ConversationSummaryDto[]>(`${this.config.apiBaseUrl}${CONVERSATIONS_PATH}`),
    );
    return dtos.map(mapConversationSummaryDto);
  }

  async getConversation(id: string): Promise<Conversation> {
    const dto = await firstValueFrom(
      this.http.get<ConversationDto>(`${this.config.apiBaseUrl}${CONVERSATIONS_PATH}/${id}`),
    );
    return mapConversationDto(dto);
  }

  async deleteConversation(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.config.apiBaseUrl}${CONVERSATIONS_PATH}/${id}`),
    );
  }

  async generateTitle(messages: readonly ChatMessage[], threadId: string): Promise<string> {
    const payload: GenerateTitleRequestDto = {
      messages: messages.map((message) => ({ role: message.role, content: message.content })),
      thread_id: threadId,
    };
    const dto = await firstValueFrom(
      this.http.post<ConversationTitleDto>(`${this.config.apiBaseUrl}${TITLE_PATH}`, payload),
    );
    return dto.title;
  }
}
