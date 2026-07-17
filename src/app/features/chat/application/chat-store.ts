import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import {
  AgentTrace,
  ChartSpec,
  ChatMessage,
  ChatReference,
  ChatRepository,
  ChatStreamEvent,
  Contribution,
  ToolCall,
  buildRoutingHops,
  buildToolHops,
  resolveRespondingAgent,
  snapshotRoutingHops,
  snapshotToolHops,
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
  private readonly destroyRef = inject(DestroyRef);

  /** Aborts the in-flight stream when the page-scoped store is destroyed (navigation). */
  private abortController: AbortController | null = null;

  /**
   * Coalesces streamed tokens: every token is buffered and flushed at most once per
   * animation frame into a single `syncSessionMessages` call, so a fast stream no longer
   * rebuilds the messages array (and re-runs change detection) on every token.
   */
  private tokenBuffer = '';
  private tokenTargetId: string | null = null;
  /**
   * The session that owns the buffered tokens — captured at `send()` and carried here so a
   * deferred (rAF) flush writes to the ORIGINATING thread even if the user switched the active
   * session mid-stream. Without it the flush would fall back to the now-active session.
   */
  private tokenTargetSessionId: string | null = null;
  private flushHandle: number | null = null;

  private readonly streamingSignal = signal(false);
  private readonly tracesSignal = signal<AgentTrace[]>([]);
  private readonly toolCallsSignal = signal<ToolCall[]>([]);
  private readonly contributionsSignal = signal<Contribution[]>([]);
  private readonly errorSignal = signal<string | null>(null);
  private readonly pendingReferenceSignal = signal<ChatReference | null>(null);

  readonly messages = this.sessionsStore.activeMessages;
  readonly isStreaming = this.streamingSignal.asReadonly();
  readonly traces = this.tracesSignal.asReadonly();
  readonly toolCalls = this.toolCallsSignal.asReadonly();
  /**
   * Per-specialist stances for the live turn, streamed once at synthesizer entry
   * on a multi-agent turn. Reset each `send()` (like traces/tools); empty on
   * single-route turns. The chat page collapses it into the bull/bear verdict meter.
   */
  readonly contributions = this.contributionsSignal.asReadonly();
  readonly routingHops = computed(() => buildRoutingHops(this.tracesSignal()));
  readonly toolHops = computed(() => buildToolHops(this.toolCallsSignal()));
  readonly error = this.errorSignal.asReadonly();
  readonly canSend = computed(() => !this.streamingSignal());
  /** Market/news reference that will be attached to the next message sent. */
  readonly pendingReference = this.pendingReferenceSignal.asReadonly();

  constructor(private readonly chatRepository: ChatRepository) {
    // The store is page-scoped, so navigation away destroys it mid-turn: abort the fetch
    // and drop any buffered tokens so no late frame writes to the (root) sessions store.
    this.destroyRef.onDestroy(() => {
      this.abortController?.abort();
      this.cancelScheduledFlush();
    });
  }

  /** Pins a market/news reference to the next message; shown as a chip until sent. */
  setReference(reference: ChatReference): void {
    this.pendingReferenceSignal.set(reference);
  }

  /** Drops the pending reference (user dismissed the chip). */
  clearReference(): void {
    this.pendingReferenceSignal.set(null);
  }

  async send(message: string): Promise<void> {
    const trimmed = message.trim();
    if (!trimmed || this.streamingSignal()) {
      return;
    }

    const reference = this.pendingReferenceSignal();
    // Capture the originating thread once. Every write for this turn targets THIS id — not the
    // active session — so clicking another conversation in the sidebar mid-stream (which changes
    // the active session without destroying this page-scoped store) can't redirect the reply.
    const threadId = this.sessionsStore.ensureActiveSession();
    const userMessage: ChatMessage = {
      id: this.nextId(),
      role: USER_ROLE,
      content: trimmed,
      ...(reference ? { reference } : {}),
    };
    this.appendMessage(threadId, userMessage);
    this.clearReference();
    this.errorSignal.set(null);
    this.streamingSignal.set(true);

    const assistantId = this.nextId();
    this.appendMessage(threadId, { id: assistantId, role: ASSISTANT_ROLE, content: '', pending: true });
    this.tracesSignal.set([]);
    this.toolCallsSignal.set([]);
    this.contributionsSignal.set([]);

    const controller = this.createAbortController();
    this.abortController = controller;

    try {
      for await (const event of this.chatRepository.streamReply(
        trimmed,
        threadId,
        reference ?? undefined,
        controller?.signal,
      )) {
        this.applyStreamEvent(threadId, assistantId, event);
      }
    } catch (error: unknown) {
      if (!this.isAbortError(error)) {
        this.errorSignal.set(this.toErrorMessage(error));
      }
    } finally {
      this.flushTokens();
      if (this.abortController === controller) {
        this.abortController = null;
      }
      // Skip the full settle when the turn was aborted (store destroyed): the sessions store
      // is root-scoped and survives, so writing a half-finished turn into whatever session is
      // now active would clobber it. Still clear the aborted thread's pending flag by id so a
      // return to that chat doesn't show a thinking bubble that never completes.
      if (controller?.signal.aborted ?? false) {
        this.sessionsStore.settlePendingMessages(threadId);
      } else {
        this.settleTurn(threadId, assistantId);
      }
      this.streamingSignal.set(false);
    }
  }

  private applyStreamEvent(sessionId: string, assistantId: string, event: ChatStreamEvent): void {
    // Every non-token event (chart, citations, trace, tool, error) must land after the
    // tokens that preceded it, so flush the pending buffer first to preserve ordering.
    if (event.kind !== 'token') {
      this.flushTokens();
    }
    switch (event.kind) {
      case 'token':
        this.appendToken(sessionId, assistantId, event.text);
        break;
      case 'trace':
        this.tracesSignal.update((traces) => [...traces, event.trace]);
        break;
      case 'tool':
        this.toolCallsSignal.update((calls) => [...calls, event.tool]);
        break;
      case 'chart':
        this.appendChart(sessionId, assistantId, event.chart);
        break;
      case 'citations':
        this.setCitations(sessionId, assistantId, event.citations);
        break;
      case 'contributions':
        this.contributionsSignal.set(event.contributions);
        break;
      case 'error':
        this.errorSignal.set(event.message);
        break;
    }
  }

  private appendMessage(sessionId: string, message: ChatMessage): void {
    this.sessionsStore.syncSessionMessages(sessionId, [
      ...this.sessionsStore.messagesOf(sessionId),
      message,
    ]);
  }

  private appendToken(sessionId: string, messageId: string, token: string): void {
    this.tokenTargetSessionId = sessionId;
    this.tokenTargetId = messageId;
    this.tokenBuffer += token;
    this.scheduleFlush();
  }

  /** Schedules a token flush on the next animation frame (immediate where rAF is absent). */
  private scheduleFlush(): void {
    if (this.flushHandle !== null) {
      return;
    }
    if (typeof requestAnimationFrame !== 'function') {
      this.flushTokens();
      return;
    }
    this.flushHandle = requestAnimationFrame(() => {
      this.flushHandle = null;
      this.flushTokens();
    });
  }

  /** Writes the buffered tokens into the target message in one array rebuild. */
  private flushTokens(): void {
    if (this.flushHandle !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.flushHandle);
    }
    this.flushHandle = null;

    if (!this.tokenBuffer || this.tokenTargetId === null || this.tokenTargetSessionId === null) {
      return;
    }
    const sessionId = this.tokenTargetSessionId;
    const messageId = this.tokenTargetId;
    const chunk = this.tokenBuffer;
    this.tokenBuffer = '';
    this.tokenTargetId = null;
    this.tokenTargetSessionId = null;

    this.sessionsStore.syncSessionMessages(
      sessionId,
      this.sessionsStore
        .messagesOf(sessionId)
        .map((message) =>
          message.id === messageId ? { ...message, content: message.content + chunk } : message,
        ),
    );
  }

  /** Drops any buffered tokens and pending flush without writing (used on destroy). */
  private cancelScheduledFlush(): void {
    if (this.flushHandle !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.flushHandle);
    }
    this.flushHandle = null;
    this.tokenBuffer = '';
    this.tokenTargetId = null;
    this.tokenTargetSessionId = null;
  }

  private appendChart(sessionId: string, messageId: string, chart: ChartSpec): void {
    this.sessionsStore.syncSessionMessages(
      sessionId,
      this.sessionsStore
        .messagesOf(sessionId)
        .map((message) =>
          message.id === messageId
            ? { ...message, charts: [...(message.charts ?? []), chart] }
            : message,
        ),
    );
  }

  private setCitations(
    sessionId: string,
    messageId: string,
    citations: ChatMessage['citations'],
  ): void {
    this.sessionsStore.syncSessionMessages(
      sessionId,
      this.sessionsStore
        .messagesOf(sessionId)
        .map((message) =>
          message.id === messageId ? { ...message, citations: citations ?? [] } : message,
        ),
    );
  }

  /**
   * Settles the turn in a SINGLE messages write: enriches the assistant message with the
   * resolved agent/routing/tools, then hands the full array to `replaceSessionMessages`,
   * which clears the pending flags, refreshes the title, and triggers server-side titling.
   * Targets the originating thread by id (not the active session) so a mid-stream session
   * switch settles the correct thread. Previously this was two writes (a `syncSessionMessages`
   * here plus a settle in the caller) — two change-detection passes at the end of every stream.
   */
  private settleTurn(sessionId: string, messageId: string): void {
    const agent = resolveRespondingAgent(this.routingHops());
    const routingHops = snapshotRoutingHops(this.routingHops());
    const tools = snapshotToolHops(this.toolHops());

    const settled = this.sessionsStore.messagesOf(sessionId).map((message) =>
      message.id === messageId
        ? {
            ...message,
            pending: false,
            ...(agent ? { agent } : {}),
            ...(routingHops.length > 0 ? { routingHops } : {}),
            ...(tools.length > 0 ? { tools } : {}),
          }
        : message,
    );

    this.sessionsStore.replaceSessionMessages(sessionId, settled);
  }

  private createAbortController(): AbortController | null {
    return typeof AbortController === 'function' ? new AbortController() : null;
  }

  private isAbortError(error: unknown): boolean {
    return (error instanceof DOMException || error instanceof Error) && error.name === 'AbortError';
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
