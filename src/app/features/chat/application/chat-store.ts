import { Injectable, computed, signal } from '@angular/core';
import { ChatMessage, ChatRepository } from '../domain';

const ASSISTANT_ROLE = 'assistant';
const USER_ROLE = 'user';

/**
 * Signal-based state + facade for the chat feature. Presentation components
 * read `messages`/`isStreaming` and call `send()`; they never touch
 * ChatRepository directly.
 */
@Injectable()
export class ChatStore {
  private readonly messagesSignal = signal<ChatMessage[]>([]);
  private readonly streamingSignal = signal(false);

  readonly messages = this.messagesSignal.asReadonly();
  readonly isStreaming = this.streamingSignal.asReadonly();
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
    this.streamingSignal.set(true);

    try {
      for await (const token of this.chatRepository.streamReply(trimmed)) {
        this.appendToken(assistantId, token);
      }
    } finally {
      this.markSettled(assistantId);
      this.streamingSignal.set(false);
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

  private nextId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  }
}
