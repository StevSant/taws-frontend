import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import {
  AgentTrace,
  ChatMessage,
  ChatRepository,
  ChatStreamEvent,
  buildRoutingHops,
} from '../domain';

const ASSISTANT_ROLE = 'assistant';
const USER_ROLE = 'user';

/**
 * Signal-based state + facade for the chat feature. Presentation components
 * read `messages`/`isStreaming`/`traces`/`error` and call `send()`; they
 * never touch ChatRepository or SSE parsing directly.
 */
@Injectable()
export class ChatStore {
  private readonly messagesSignal = signal<ChatMessage[]>([]);
  private readonly streamingSignal = signal(false);
  private readonly tracesSignal = signal<AgentTrace[]>([]);
  private readonly errorSignal = signal<string | null>(null);

  readonly messages = this.messagesSignal.asReadonly();
  readonly isStreaming = this.streamingSignal.asReadonly();
  /** Agent routing trace for the *current* turn — cleared on every new send. */
  readonly traces = this.tracesSignal.asReadonly();
  /**
   * `traces` collapsed into one display hop per distinct agent (e.g.
   * "Supervisor -> Quant"), updated live as trace events arrive. This is
   * what the routing-trace UI renders — see `buildRoutingHops` for why it
   * doesn't clutter simple, single-specialist turns.
   */
  readonly routingHops = computed(() => buildRoutingHops(this.tracesSignal()));
  /** Stream-level error message for the current turn, if any. */
  readonly error = this.errorSignal.asReadonly();
  readonly canSend = computed(() => !this.streamingSignal());

  constructor(private readonly chatRepository: ChatRepository) {}

  async send(message: string): Promise<void> {
    const trimmed = message.trim();
    if (!trimmed || this.streamingSignal()) {
      return;
    }

    this.appendMessage({ id: this.nextId(), role: USER_ROLE, content: trimmed });

    const assistantId = this.nextId();
    this.appendMessage({ id: assistantId, role: ASSISTANT_ROLE, content: '', pending: true });
    this.tracesSignal.set([]);
    this.errorSignal.set(null);
    this.streamingSignal.set(true);

    try {
      for await (const event of this.chatRepository.streamReply(trimmed)) {
        this.applyStreamEvent(assistantId, event);
      }
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
    } finally {
      this.markSettled(assistantId);
      this.streamingSignal.set(false);
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
      case 'error':
        this.errorSignal.set(event.message);
        break;
    }
  }

  private appendMessage(message: ChatMessage): void {
    this.messagesSignal.update((messages) => [...messages, message]);
  }

  private appendToken(messageId: string, token: string): void {
    this.messagesSignal.update((messages) =>
      messages.map((message) =>
        message.id === messageId ? { ...message, content: message.content + token } : message,
      ),
    );
  }

  private markSettled(messageId: string): void {
    this.messagesSignal.update((messages) =>
      messages.map((message) =>
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
