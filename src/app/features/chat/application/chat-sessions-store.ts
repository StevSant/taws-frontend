import { Injectable, computed, signal } from '@angular/core';
import { ChatMessage } from '../domain';
import { ChatSession } from '../domain/models/chat-session.model';
import { loadChatSessions, saveChatSessions } from '../infrastructure/persist-chat-sessions';

const DEFAULT_TITLE_KEY = '__new__';

@Injectable()
export class ChatSessionsStore {
  private readonly sessionsSignal = signal<ChatSession[]>([]);
  private readonly activeIdSignal = signal<string | null>(null);
  private userId: string | null = null;

  readonly sessions = computed(() =>
    [...this.sessionsSignal()].sort(
      (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
    ),
  );

  readonly activeSessionId = this.activeIdSignal.asReadonly();

  readonly activeSession = computed(() => {
    const id = this.activeIdSignal();
    if (!id) {
      return null;
    }
    return this.sessionsSignal().find((session) => session.id === id) ?? null;
  });

  readonly activeMessages = computed(() => this.activeSession()?.messages ?? []);

  bootstrap(userId: string): void {
    this.userId = userId;
    const loaded = loadChatSessions(userId).map((session) => ({
      ...session,
      messages: session.messages.map((message) => ({ ...message, pending: false })),
    }));
    this.sessionsSignal.set(loaded);

    if (loaded.length === 0) {
      const id = this.createSession();
      this.activeIdSignal.set(id);
      return;
    }

    const mostRecent = [...loaded].sort(
      (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
    )[0];
    this.activeIdSignal.set(mostRecent?.id ?? loaded[0].id);
  }

  clear(): void {
    this.userId = null;
    this.sessionsSignal.set([]);
    this.activeIdSignal.set(null);
  }

  createSession(): string {
    const now = new Date().toISOString();
    const session: ChatSession = {
      id: this.nextId(),
      title: DEFAULT_TITLE_KEY,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    this.sessionsSignal.update((sessions) => [session, ...sessions]);
    this.activeIdSignal.set(session.id);
    this.persist();
    return session.id;
  }

  selectSession(sessionId: string): void {
    if (!this.sessionsSignal().some((session) => session.id === sessionId)) {
      return;
    }
    this.activeIdSignal.set(sessionId);
  }

  deleteSession(sessionId: string): void {
    const remaining = this.sessionsSignal().filter((session) => session.id !== sessionId);
    this.sessionsSignal.set(remaining);

    if (this.activeIdSignal() === sessionId) {
      if (remaining.length > 0) {
        this.activeIdSignal.set(remaining[0].id);
      } else {
        this.createSession();
      }
    }

    this.persist();
  }

  ensureActiveSession(): string {
    const activeId = this.activeIdSignal();
    if (activeId && this.sessionsSignal().some((session) => session.id === activeId)) {
      return activeId;
    }
    return this.createSession();
  }

  replaceActiveMessages(messages: ChatMessage[]): void {
    const activeId = this.ensureActiveSession();
    const persisted = messages.map((message) => ({ ...message, pending: false }));
    const now = new Date().toISOString();

    this.sessionsSignal.update((sessions) =>
      sessions.map((session) => {
        if (session.id !== activeId) {
          return session;
        }
        return {
          ...session,
          messages: persisted,
          title: this.deriveTitle(session.title, persisted),
          updatedAt: now,
        };
      }),
    );
    this.persist();
  }

  syncActiveMessages(messages: ChatMessage[]): void {
    const activeId = this.ensureActiveSession();
    const now = new Date().toISOString();

    this.sessionsSignal.update((sessions) =>
      sessions.map((session) => {
        if (session.id !== activeId) {
          return session;
        }
        return {
          ...session,
          messages,
          title: this.deriveTitle(session.title, messages),
          updatedAt: now,
        };
      }),
    );
    this.persist();
  }

  isDefaultTitle(title: string): boolean {
    return title === DEFAULT_TITLE_KEY;
  }

  private deriveTitle(currentTitle: string, messages: ChatMessage[]): string {
    if (currentTitle !== DEFAULT_TITLE_KEY) {
      return currentTitle;
    }
    const firstUser = messages.find((message) => message.role === 'user');
    if (!firstUser?.content.trim()) {
      return DEFAULT_TITLE_KEY;
    }
    const trimmed = firstUser.content.trim();
    return trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
  }

  private persist(): void {
    if (!this.userId) {
      return;
    }
    const toSave = this.sessionsSignal().map((session) => ({
      ...session,
      messages: session.messages.map((message) => ({ ...message, pending: false })),
    }));
    saveChatSessions(this.userId, toSave);
  }

  private nextId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  }
}
