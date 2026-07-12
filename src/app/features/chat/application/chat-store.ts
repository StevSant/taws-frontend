import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { AgentTrace, ChartSpec, ChatMessage, ChatRepository, ChatStreamEvent, ToolCall, buildRoutingHops, buildToolHops, resolveRespondingAgent, snapshotToolHops } from '../domain';
import { ChatSessionsStore } from './chat-sessions-store';

const ASSISTANT_ROLE = 'assistant';
const USER_ROLE = 'user';

/**
 * Signal-based state + facade for the chat feature. Presentation components
 * read `messages`/`isStreaming`/`traces`/`error` and call `send()`; they
 * never touch ChatRepository or SSE parsing directly.
 */
@Injectable()
export class ChatStore {
  private readonly sessionsStore = inject(ChatSessionsStore);

  private readonly streamingSignal = signal(false);
  private readonly tracesSignal = signal<AgentTrace[]>([]);
  private readonly toolCallsSignal = signal<ToolCall[]>([]);
  private readonly errorSignal = signal<string | null>(null);

  readonly messages = this.sessionsStore.activeMessages;
  readonly isStreaming = this.streamingSignal.asReadonly();
  readonly traces = this.tracesSignal.asReadonly();
  readonly toolCalls = this.toolCallsSignal.asReadonly();
  readonly routingHops = computed(() => buildRoutingHops(this.tracesSignal()));
  readonly toolHops = computed(() => buildToolHops(this.toolCallsSignal()));
  readonly error = this.errorSignal.asReadonly();
  readonly canSend = computed(() => !this.streamingSignal());

  constructor(private readonly chatRepository: ChatRepository) {}

  async send(message: string): Promise<void> {
    const trimmed = message.trim();
    if (!trimmed || this.streamingSignal()) {
      return;
    }

    const threadId = this.sessionsStore.ensureActiveSession();
    const userMessage: ChatMessage = { id: this.nextId(), role: USER_ROLE, content: trimmed };
    this.appendMessage(userMessage);
    this.errorSignal.set(null);
    this.streamingSignal.set(true);

    const assistantId = this.nextId();
    this.appendMessage({ id: assistantId, role: ASSISTANT_ROLE, content: '', pending: true });
    this.tracesSignal.set([]);
    this.toolCallsSignal.set([]);

    try {
      for await (const event of this.chatRepository.streamReply(trimmed, threadId)) {
        this.applyStreamEvent(assistantId, event);
      }
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
    } finally {
      this.markSettled(assistantId);
      this.streamingSignal.set(false);
      this.sessionsStore.replaceActiveMessages(this.messages());
    }
  }

  private applyStreamEvent(assistantId: string, event: ChatStreamEvent): void {
    switch (event.kind) {
      case 'token':
        this.appendToken(assistantId, event.text);
        break;
      case 'trace':
        this.tracesSignal.update((traces) => [...traces, event.trace]);
        break;
      case 'tool':
        this.toolCallsSignal.update((calls) => [...calls, event.tool]);
        break;
      case 'chart':
        this.appendChart(assistantId, event.chart);
        break;
      case 'error':
        this.errorSignal.set(event.message);
        break;
    }
  }

  private appendMessage(message: ChatMessage): void {
    this.sessionsStore.syncActiveMessages([...this.messages(), message]);
  }

  private appendToken(messageId: string, token: string): void {
    this.sessionsStore.syncActiveMessages(
      this.messages().map((message) =>
        message.id === messageId ? { ...message, content: message.content + token } : message,
      ),
    );
  }

  private appendChart(messageId: string, chart: ChartSpec): void {
    this.sessionsStore.syncActiveMessages(
      this.messages().map((message) =>
        message.id === messageId
          ? { ...message, charts: [...(message.charts ?? []), chart] }
          : message,
      ),
    );
  }

  private markSettled(messageId: string): void {
    const agent = resolveRespondingAgent(this.routingHops());
    const tools = snapshotToolHops(this.toolHops());

    this.sessionsStore.syncActiveMessages(
      this.messages().map((message) =>
        message.id === messageId
          ? {
              ...message,
              pending: false,
              ...(agent ? { agent } : {}),
              ...(tools.length > 0 ? { tools } : {}),
            }
          : message,
      ),
    );
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return error.error?.detail ?? error.message ?? 'Unknown streaming error';
    }
    return error instanceof Error ? error.message : 'Unknown streaming error';
  }

  private nextId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  }
}
