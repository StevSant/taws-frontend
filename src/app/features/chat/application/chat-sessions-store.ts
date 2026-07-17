import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { ChatMessage, ChatRepository, ChatSession, ConversationSummary } from '../domain';

const DEFAULT_TITLE_KEY = '__new__';
const HTTP_NOT_FOUND = 404;

/**
 * Signal state for the chat sessions sidebar. The SERVER is the source of truth: the list
 * is hydrated from `GET /chat/conversations`, a transcript from
 * `GET /chat/conversations/{id}` when its thread is opened, and every turn is persisted by
 * the stream endpoint itself — so this store never writes a transcript anywhere.
 *
 * The signals are still the live rendering state: a streaming reply is appended
 * optimistically, token by token, and shows up immediately. It is simply never mirrored to
 * storage — the previous localStorage mirror re-serialized EVERY session on EVERY token,
 * and could throw `QuotaExceededError` out of the streaming `finally` block.
 *
 * Root-scoped (a single app-wide instance) so the live transcript — including charts, which
 * are streamed client-side and never persisted server-side — survives navigating away from
 * the chat page and back. A per-page instance was destroyed on every navigation and re-read a
 * text-only transcript from the server, silently dropping the charts the user had just seen.
 */
@Injectable({ providedIn: 'root' })
export class ChatSessionsStore {
  private readonly chatRepository = inject(ChatRepository);

  private readonly sessionsSignal = signal<ChatSession[]>([]);
  private readonly activeIdSignal = signal<string | null>(null);
  private readonly isLoadingSignal = signal(false);
  private readonly isReadySignal = signal(false);
  private readonly missingSessionNoticeSignal = signal(false);

  /** Threads whose transcript has already been fetched (or that were born empty here). */
  private readonly hydratedIds = new Set<string>();
  /** Threads the backend has already titled — never ask it for a title twice. */
  private readonly titledIds = new Set<string>();
  /**
   * Threads with a real server row created OUTSIDE the SSE stream — the realtime/voice
   * persistence path. They must never be ghost-dropped on a transient 404 (read-after-write
   * lag), because their turns live on the server.
   */
  private readonly serverBackedIds = new Set<string>();
  private userId: string | null = null;

  readonly sessions = computed(() =>
    [...this.sessionsSignal()].sort(
      (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
    ),
  );

  readonly activeSessionId = this.activeIdSignal.asReadonly();

  /** True while the session list is being fetched from the server. */
  readonly isLoading = this.isLoadingSignal.asReadonly();

  /** True once `bootstrap` has settled — the route may only be resolved after that. */
  readonly isReady = this.isReadySignal.asReadonly();

  /**
   * True after a `/chat/:id` navigation pointed at a thread the server does not have —
   * a stale link to a deleted thread, or one whose turns were never persisted. The chat
   * page renders it as a dismissible banner so the fallback to a fresh chat is explained
   * instead of silently masked.
   */
  readonly missingSessionNotice = this.missingSessionNoticeSignal.asReadonly();

  readonly activeSession = computed(() => {
    const id = this.activeIdSignal();
    if (!id) {
      return null;
    }
    return this.sessionsSignal().find((session) => session.id === id) ?? null;
  });

  readonly activeMessages = computed(() => this.activeSession()?.messages ?? []);

  /**
   * Non-reactive snapshot of a specific thread's messages by id. The streaming store reads the
   * ORIGINATING thread through this (not `activeMessages`) so a mid-stream sidebar switch — which
   * changes the active session without destroying the page store — can't retarget the turn's
   * writes onto whatever thread is now active. Empty array when the thread no longer exists.
   */
  messagesOf(sessionId: string): ChatMessage[] {
    return this.sessionsSignal().find((session) => session.id === sessionId)?.messages ?? [];
  }

  /**
   * Loads the user's conversations from the server. A failure (offline, 5xx) degrades to
   * an empty sidebar rather than blocking the page: the user can still start a new chat,
   * and their history reappears on the next successful load.
   */
  async bootstrap(userId: string): Promise<void> {
    // Idempotent per user. The chat page re-runs this whenever `auth.user()` changes
    // reference — which a Supabase token refresh (and any 401-triggered re-auth) does on a
    // timer with the SAME signed-in user. Clearing and refetching there flashed the sidebar
    // empty mid-conversation and dropped the in-memory transcript/charts. Only a genuine user
    // change (sign out -> in, account switch) rebuilds from scratch; a same-user re-entry
    // keeps the already-loaded state.
    if (this.userId === userId && (this.isReadySignal() || this.isLoadingSignal())) {
      return;
    }

    this.userId = userId;
    this.hydratedIds.clear();
    this.titledIds.clear();
    this.serverBackedIds.clear();
    this.sessionsSignal.set([]);
    this.activeIdSignal.set(null);
    this.isLoadingSignal.set(true);
    this.isReadySignal.set(false);

    let summaries: ConversationSummary[] = [];
    try {
      summaries = await this.chatRepository.listConversations();
    } catch {
      summaries = [];
    }

    // A response for a user we have since signed out of (or switched away from) must not
    // repopulate the sidebar.
    if (this.userId !== userId) {
      return;
    }

    this.sessionsSignal.set(summaries.map((summary) => this.toSession(summary)));
    this.isLoadingSignal.set(false);
    this.isReadySignal.set(true);
  }

  /**
   * Resolves the thread a `/chat` route should show and returns its canonical id (which the
   * router mirrors into `/chat/:sessionId`), pulling that thread's transcript from the server
   * in the background. A known id activates that thread. A bare `/chat` (null id) opens the
   * new-chat surface — an existing empty thread when there is one, otherwise a fresh one — so
   * clicking "Chat" never lands on an arbitrary old conversation. An unknown id (a stale link
   * to a deleted thread, or to one the backend never persisted) also opens the new-chat
   * surface, and additionally raises `missingSessionNotice` explaining the swap.
   */
  resolveSessionRoute(sessionId: string | null): string {
    const sessions = this.sessionsSignal();
    if (sessionId && sessions.some((session) => session.id === sessionId)) {
      this.missingSessionNoticeSignal.set(false);
      this.activeIdSignal.set(sessionId);
      void this.hydrateSession(sessionId);
      return sessionId;
    }

    // Bare /chat: the new-chat surface. `createSession` is reuse-first, so this reuses an
    // existing empty thread when there is one and otherwise opens a fresh one — it never
    // resolves to "most recent", which is what dropped the user onto a stale conversation.
    if (sessionId === null) {
      this.missingSessionNoticeSignal.set(false);
      return this.createSession();
    }

    // Unknown id. This used to silently activate the most recent thread, which read as
    // "my conversation was replaced by an old one" — the ghost-conversation confusion a
    // lost background persist produces (see the backend's `StreamAndPersistReply`). Fall
    // back to the new-chat surface instead, with a dismissible notice naming what happened.
    this.missingSessionNoticeSignal.set(true);
    return this.createSession();
  }

  clear(): void {
    this.userId = null;
    this.hydratedIds.clear();
    this.titledIds.clear();
    this.serverBackedIds.clear();
    this.sessionsSignal.set([]);
    this.activeIdSignal.set(null);
    this.isReadySignal.set(false);
    this.missingSessionNoticeSignal.set(false);
  }

  dismissMissingSessionNotice(): void {
    this.missingSessionNoticeSignal.set(false);
  }

  /**
   * Opens an empty thread locally. No server call: the backend creates the conversation
   * row on the first streamed turn, keyed by this id — which is the `thread_id` the stream
   * endpoint already receives.
   *
   * Reuse-first: an empty thread that is already open is indistinguishable from a brand-new
   * one to the user, so an existing empty thread is activated and returned instead of stacking
   * another "Nueva conversación". This applies to every caller — the sidebar's "Nuevo chat",
   * a bare `/chat`, a news/asset reference intent — so repeatedly asking for a new chat can
   * never pile up duplicate empty sessions.
   */
  createSession(): string {
    const reusable = this.findReusableEmptySession();
    if (reusable) {
      this.activeIdSignal.set(reusable.id);
      return reusable.id;
    }

    const now = new Date().toISOString();
    const session: ChatSession = {
      id: this.nextId(),
      title: DEFAULT_TITLE_KEY,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    // Born empty and local — there is nothing on the server to fetch for it.
    this.hydratedIds.add(session.id);
    this.sessionsSignal.update((sessions) => [session, ...sessions]);
    this.activeIdSignal.set(session.id);
    return session.id;
  }

  selectSession(sessionId: string): void {
    if (!this.sessionsSignal().some((session) => session.id === sessionId)) {
      return;
    }
    this.activeIdSignal.set(sessionId);
    void this.hydrateSession(sessionId);
  }

  /**
   * Deletes the thread on the server and drops it locally. The local drop is optimistic so
   * the sidebar (and the caller's follow-up navigation) stay synchronous; if the server
   * call fails the thread reappears on the next load, which beats blocking the UI. A thread
   * that was never streamed to has no row yet — its 404 is expected and ignored.
   */
  deleteSession(sessionId: string): void {
    const remaining = this.sessionsSignal().filter((session) => session.id !== sessionId);
    this.sessionsSignal.set(remaining);
    this.hydratedIds.delete(sessionId);
    this.titledIds.delete(sessionId);
    this.serverBackedIds.delete(sessionId);

    if (this.activeIdSignal() === sessionId) {
      if (remaining.length > 0) {
        this.activeIdSignal.set(remaining[0].id);
        void this.hydrateSession(remaining[0].id);
      } else {
        this.createSession();
      }
    }

    void this.chatRepository.deleteConversation(sessionId).catch(() => undefined);
  }

  ensureActiveSession(): string {
    const activeId = this.activeIdSignal();
    if (activeId && this.sessionsSignal().some((session) => session.id === activeId)) {
      return activeId;
    }
    return this.createSession();
  }

  /** Settles the active thread at the end of a turn, and asks the backend for a title. */
  replaceActiveMessages(messages: ChatMessage[]): void {
    this.replaceSessionMessages(this.ensureActiveSession(), messages);
  }

  /**
   * Settles a SPECIFIC thread at the end of a turn (by id), then asks the backend for a title.
   * The streaming store settles the originating thread through this so a mid-stream session
   * switch can't settle the wrong one. No-op if that thread was deleted while streaming — a
   * settle must never resurrect a gone thread.
   */
  replaceSessionMessages(sessionId: string, messages: ChatMessage[]): void {
    const settled = messages.map((message) => ({ ...message, pending: false }));

    this.patchSession(sessionId, (session) => ({
      ...session,
      messages: settled,
      title: this.deriveTitle(session.title, settled),
      updatedAt: new Date().toISOString(),
    }));

    void this.ensureServerTitle(sessionId);
  }

  /**
   * Appends turns produced outside the SSE stream (the realtime voice agent) to the active
   * thread.
   */
  appendActiveMessages(messages: readonly ChatMessage[]): void {
    if (messages.length === 0) {
      return;
    }

    const activeId = this.ensureActiveSession();
    const appended = messages.map((message) => ({ ...message, pending: false }));

    this.patchSession(activeId, (session) => {
      const merged = [...session.messages, ...appended];
      return {
        ...session,
        messages: merged,
        title: this.deriveTitle(session.title, merged),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  /**
   * Records a completed realtime/voice session and binds it to the server `conversationId` the
   * backend minted for it, so a page refresh rehydrates its turns via `getConversation`. The
   * turns render immediately (optimistic); the thread is marked hydrated (a later open won't
   * refetch and clobber them) and server-backed (a transient 404 can't ghost-drop it); and the
   * server persist is best-effort — a failure only means the turns won't survive a reload.
   *
   * With no `conversationId` (an older backend that mints none) it degrades to the previous
   * local-only behavior via `appendActiveMessages`: the turns show but are not persisted.
   */
  appendRealtimeConversation(
    conversationId: string | null,
    messages: readonly ChatMessage[],
  ): void {
    if (messages.length === 0) {
      return;
    }

    if (!conversationId) {
      this.appendActiveMessages(messages);
      return;
    }

    const appended = messages.map((message) => ({ ...message, pending: false }));
    const now = new Date().toISOString();
    const existing = this.sessionsSignal().find((session) => session.id === conversationId);

    if (existing) {
      this.patchSession(conversationId, (session) => {
        const merged = [...session.messages, ...appended];
        return {
          ...session,
          messages: merged,
          title: this.deriveTitle(session.title, merged),
          updatedAt: now,
        };
      });
    } else {
      const session: ChatSession = {
        id: conversationId,
        title: this.deriveTitle(DEFAULT_TITLE_KEY, appended),
        messages: appended,
        createdAt: now,
        updatedAt: now,
      };
      this.sessionsSignal.update((sessions) => [session, ...sessions]);
    }

    this.hydratedIds.add(conversationId);
    this.serverBackedIds.add(conversationId);
    this.activeIdSignal.set(conversationId);

    void this.persistRealtimeTurns(conversationId, appended);
  }

  private async persistRealtimeTurns(
    conversationId: string,
    messages: readonly ChatMessage[],
  ): Promise<void> {
    try {
      await this.chatRepository.persistRealtimeTurns(conversationId, messages);
    } catch {
      // Best-effort: the turns are already visible locally; a failed persist only means they
      // won't survive a refresh. Never disrupt the UI over it.
    }
  }

  /**
   * Live in-memory update for the thread being streamed — called on EVERY token. It only
   * touches signals: the backend already persists the turn, so there is deliberately no
   * write of any kind on this path.
   */
  syncActiveMessages(messages: ChatMessage[]): void {
    this.syncSessionMessages(this.ensureActiveSession(), messages);
  }

  /**
   * Live in-memory update for a SPECIFIC thread by id — the streaming path routes every token
   * (and chart/citations) here against the ORIGINATING thread, so a mid-stream sidebar switch
   * can't append the reply to whatever session is now active. No-op if the thread was deleted
   * while streaming, since `patchSession` only touches a matching id. Signals only — no persist.
   */
  syncSessionMessages(sessionId: string, messages: ChatMessage[]): void {
    this.patchSession(sessionId, (session) => ({
      ...session,
      messages,
      title: this.deriveTitle(session.title, messages),
      updatedAt: new Date().toISOString(),
    }));
  }

  /**
   * Settles a specific thread's messages after an aborted stream, by id rather than on the
   * active session. Used when a stream is aborted mid-turn (the page store is destroyed on
   * navigation) and the full settle is skipped: the abort may fire AFTER the active session
   * has already changed, so an active-session write would settle the wrong thread.
   * An assistant message that never received any content (no text, no charts) is dropped
   * entirely — a settled-but-empty bubble reads as a broken reply; the remaining messages
   * just get their `pending` flag cleared, content/agent/tools left as-is. No-op if the
   * thread no longer exists.
   */
  settlePendingMessages(sessionId: string): void {
    if (!this.sessionsSignal().some((session) => session.id === sessionId)) {
      return;
    }

    this.patchSession(sessionId, (session) => ({
      ...session,
      messages: session.messages
        .filter(
          (message) =>
            !(
              message.pending &&
              message.role === 'assistant' &&
              !message.content.trim() &&
              !message.charts?.length
            ),
        )
        .map((message) => ({ ...message, pending: false })),
    }));
  }

  isDefaultTitle(title: string): boolean {
    return title === DEFAULT_TITLE_KEY;
  }

  /**
   * Pulls a thread's transcript from the server the first time it is opened. Skipped for
   * threads that already hold messages locally — a streamed or realtime turn is newer than
   * anything a late response could carry — so a reply in flight is never clobbered.
   */
  private async hydrateSession(sessionId: string): Promise<void> {
    if (this.hydratedIds.has(sessionId)) {
      return;
    }
    const session = this.sessionsSignal().find((item) => item.id === sessionId);
    if (!session || session.messages.length > 0) {
      return;
    }
    this.hydratedIds.add(sessionId);

    try {
      const conversation = await this.chatRepository.getConversation(sessionId);
      const current = this.sessionsSignal().find((item) => item.id === sessionId);
      if (!current || current.messages.length > 0) {
        return; // The user started talking while the fetch was in flight — local wins.
      }
      if (conversation.title?.trim()) {
        this.titledIds.add(sessionId);
      }
      this.patchSession(sessionId, (item) => ({
        ...item,
        title: conversation.title?.trim()
          ? conversation.title
          : this.deriveTitle(item.title, conversation.messages),
        messages: conversation.messages,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      }));
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === HTTP_NOT_FOUND) {
        // The conversation does not exist server-side (deleted on another device, or a stale
        // sidebar entry the backend never persisted). Drop the ghost from the list so it can't
        // be reopened into a permanently-failing fetch — UNLESS local turns have accumulated on
        // it in the meantime (a born-empty thread the user just started streaming into, whose
        // row the backend has not written yet): those would be lost, so keep it and leave it
        // marked hydrated.
        const current = this.sessionsSignal().find((item) => item.id === sessionId);
        if (current && current.messages.length > 0) {
          return;
        }
        this.dropGhostSession(sessionId);
        return;
      }
      // Offline or a 5xx: keep the sidebar entry with its empty transcript rather than breaking
      // the page, and allow a retry the next time it is opened.
      this.hydratedIds.delete(sessionId);
    }
  }

  /**
   * Removes a thread the server 404s on — it has no row to fetch and no local turns worth
   * keeping, so it would otherwise sit in the sidebar as a ghost that never opens. Local-only:
   * there is nothing to DELETE server-side. When it was the active thread, the active pointer is
   * cleared so the page falls back to the new-chat surface rather than dangling on an id the
   * sidebar no longer lists (the URL self-heals on the next navigation or reload).
   */
  private dropGhostSession(sessionId: string): void {
    // A realtime-persisted conversation has a real server row even when a fetch transiently
    // 404s (read-after-write lag) — never drop it as a ghost.
    if (this.serverBackedIds.has(sessionId)) {
      return;
    }
    this.sessionsSignal.update((sessions) =>
      sessions.filter((session) => session.id !== sessionId),
    );
    this.hydratedIds.delete(sessionId);
    this.titledIds.delete(sessionId);
    if (this.activeIdSignal() === sessionId) {
      this.activeIdSignal.set(null);
    }
  }

  /**
   * Asks the backend for a topic title once a thread has a complete exchange, passing the
   * `thread_id` so the title is SAVED — that is what makes the sidebar show the same title
   * after a reload and on other devices, instead of every client re-deriving one from the
   * first message. Failures are silent: the locally derived title stays.
   */
  private async ensureServerTitle(sessionId: string): Promise<void> {
    if (this.titledIds.has(sessionId)) {
      return;
    }
    const session = this.sessionsSignal().find((item) => item.id === sessionId);
    if (!session || !this.hasCompleteExchange(session.messages)) {
      return;
    }
    this.titledIds.add(sessionId);

    try {
      const title = (await this.chatRepository.generateTitle(session.messages, sessionId)).trim();
      if (!title) {
        return;
      }
      this.patchSession(sessionId, (item) => ({ ...item, title }));
    } catch {
      this.titledIds.delete(sessionId);
    }
  }

  /**
   * The most recent thread that is safe to reuse as a "new chat": zero messages AND already
   * hydrated. The hydration check is load-bearing — a server thread the user has not opened
   * yet also shows zero messages locally, but it has turns waiting on the server; reusing it
   * would drop the user onto an old conversation. Only threads born empty here (`createSession`)
   * or confirmed empty by a fetch pass this gate. `null` when there is nothing reusable.
   */
  private findReusableEmptySession(): ChatSession | null {
    const empties = this.sessionsSignal().filter(
      (session) => session.messages.length === 0 && this.hydratedIds.has(session.id),
    );
    if (empties.length === 0) {
      return null;
    }
    return [...empties].sort(
      (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
    )[0];
  }

  private hasCompleteExchange(messages: readonly ChatMessage[]): boolean {
    const hasUser = messages.some((message) => message.role === 'user' && message.content.trim());
    const hasReply = messages.some(
      (message) => message.role === 'assistant' && message.content.trim(),
    );
    return hasUser && hasReply;
  }

  private patchSession(sessionId: string, patch: (session: ChatSession) => ChatSession): void {
    this.sessionsSignal.update((sessions) =>
      sessions.map((session) => (session.id === sessionId ? patch(session) : session)),
    );
  }

  /** A server summary carries no turns — those arrive when the thread is first opened. */
  private toSession(summary: ConversationSummary): ChatSession {
    const title = summary.title?.trim();
    if (title) {
      this.titledIds.add(summary.id);
    }
    return {
      id: summary.id,
      title: title ? title : DEFAULT_TITLE_KEY,
      messages: [],
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
    };
  }

  private deriveTitle(currentTitle: string, messages: readonly ChatMessage[]): string {
    if (currentTitle !== DEFAULT_TITLE_KEY) {
      return currentTitle;
    }
    const firstUser = messages.find((message) => message.role === 'user');
    if (!firstUser?.content.trim()) {
      return DEFAULT_TITLE_KEY;
    }
    const normalized = firstUser.content.trim().replace(/\s+/g, ' ');
    return normalized === '' ? DEFAULT_TITLE_KEY : normalized;
  }

  private nextId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  }
}
