import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import {
  AgentTrace,
  ChartSpec,
  ChatMessage,
  ChatRepository,
  ChatStreamEvent,
  buildRoutingHops,
} from '../domain';
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
  private readonly errorSignal = signal<string | null>(null);

  readonly messages = this.sessionsStore.activeMessages;
  readonly isStreaming = this.streamingSignal.asReadonly();
  readonly traces = this.tracesSignal.asReadonly();
  readonly routingHops = computed(() => buildRoutingHops(this.tracesSignal()));
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

    const assistantId = this.nextId();
    this.appendMessage({ id: assistantId, role: ASSISTANT_ROLE, content: '', pending: true });
    this.tracesSignal.set([]);
    this.errorSignal.set(null);
    this.streamingSignal.set(true);

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
    this.sessionsStore.syncActiveMessages(
      this.messages().map((message) =>
        message.id === messageId ? { ...message, pending: false } : message,
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
