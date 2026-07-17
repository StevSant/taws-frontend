import { Injectable, computed, inject, signal } from '@angular/core';
import { ChartSpec } from '../../../shared/charts';
import {
  RealtimeConnectionState,
  RealtimeEvent,
  RealtimeNotAvailableError,
  RealtimePermissionDeniedError,
  RealtimeSessionProvider,
  RealtimeTurn,
} from '../domain';

/**
 * Signal-based state + facade for the realtime voice agent. Presentation
 * components read `connectionState`/`liveTranscript`/`activeToolCall`/
 * `isModelSpeaking`/`error` and call `start()` / `stop()`; they never touch the
 * WebRTC transport directly.
 *
 * Depends only on the `RealtimeSessionProvider` port. The store registers a
 * single event listener on construction and maps each domain `RealtimeEvent`
 * onto its signals — transcript deltas accumulate, tool calls set/clear the
 * active-call name, speaking toggles, and error events surface without dropping
 * a live session.
 */
@Injectable()
export class RealtimeStore {
  private readonly provider = inject(RealtimeSessionProvider);

  private readonly connectionStateSignal = signal<RealtimeConnectionState>('idle');
  private readonly liveTranscriptSignal = signal('');
  private readonly activeToolCallsSignal = signal<string[]>([]);
  private readonly activeChartSignal = signal<ChartSpec | null>(null);
  private readonly isModelSpeakingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly permissionDeniedSignal = signal(false);
  private readonly notAvailableSignal = signal(false);
  private readonly conversationIdSignal = signal<string | null>(null);
  private completedTurns: RealtimeTurn[] = [];
  private pendingCharts: ChartSpec[] = [];

  readonly connectionState = this.connectionStateSignal.asReadonly();
  readonly liveTranscript = this.liveTranscriptSignal.asReadonly();
  readonly activeToolCall = computed(() => this.activeToolCallsSignal().at(-1) ?? null);
  readonly activeChart = this.activeChartSignal.asReadonly();
  readonly isModelSpeaking = this.isModelSpeakingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  /** True when the last start failed because the browser blocked mic access — lets the UI prompt to allow the mic. */
  readonly permissionDenied = this.permissionDeniedSignal.asReadonly();
  /**
   * True when the last start failed because the backend has realtime voice
   * turned off (503). Lets the UI show a calm "not available right now" message
   * with just a close button — no red retry alarm.
   */
  readonly notAvailable = this.notAvailableSignal.asReadonly();
  /**
   * Server conversation id the backend minted for this voice session (null until the session
   * starts, or when the deployment's session endpoint returns none). Read on `stop()` so the
   * completed turns can be persisted and bound to that conversation for refresh hydration.
   */
  readonly conversationId = this.conversationIdSignal.asReadonly();

  constructor() {
    this.provider.onEvent((event) => this.handleEvent(event));
  }

  /**
   * Mints a session and negotiates the WebRTC connection. Clears any prior
   * error and stale transcript first. No-op if a session is already connecting
   * or live. On failure the connection goes to `error` and the transport is
   * torn down so the mic is released.
   */
  async start(): Promise<void> {
    const state = this.connectionStateSignal();
    if (state === 'connecting' || state === 'live') {
      return;
    }

    this.resetSessionState();
    this.connectionStateSignal.set('connecting');

    try {
      await this.provider.start();
      this.connectionStateSignal.set('live');
    } catch (error: unknown) {
      this.provider.stop();
      this.errorSignal.set(this.toErrorMessage(error));

      if (error instanceof RealtimeNotAvailableError) {
        // Feature is turned off server-side — a calm, terminal state, not a
        // transient failure the user should retry.
        this.notAvailableSignal.set(true);
        this.connectionStateSignal.set('not-available');
        return;
      }

      this.permissionDeniedSignal.set(error instanceof RealtimePermissionDeniedError);
      this.connectionStateSignal.set('error');
    }
  }

  /** Ends the session and returns a snapshot of its completed turns before resetting. */
  stop(): RealtimeTurn[] {
    this.provider.stop();
    const completedTurns = this.completedTurns.map((turn) => ({
      ...turn,
      ...(turn.charts ? { charts: [...turn.charts] } : {}),
    }));
    this.resetSessionState();
    this.connectionStateSignal.set('idle');
    return completedTurns;
  }

  dismissChart(): void {
    this.activeChartSignal.set(null);
  }

  private handleEvent(event: RealtimeEvent): void {
    switch (event.kind) {
      case 'session-started':
        this.conversationIdSignal.set(event.conversationId);
        return;
      case 'transcript-delta':
        this.liveTranscriptSignal.update((current) => current + event.delta);
        return;
      case 'turn-completed': {
        const content = event.turn.content.trim();
        if (!content) {
          return;
        }
        const charts =
          event.turn.role === 'assistant' && this.pendingCharts.length > 0
            ? [...this.pendingCharts]
            : undefined;
        this.completedTurns = [
          ...this.completedTurns,
          {
            role: event.turn.role,
            content,
            ...(charts ? { charts } : {}),
          },
        ];
        if (event.turn.role === 'assistant') {
          this.pendingCharts = [];
        }
        return;
      }
      case 'speaking-changed':
        this.isModelSpeakingSignal.set(event.speaking);
        return;
      case 'tool-call-started':
        this.activeToolCallsSignal.update((calls) => [...calls, event.name]);
        return;
      case 'tool-call-finished':
        this.activeToolCallsSignal.update((calls) => {
          const index = calls.indexOf(event.name);
          return index < 0 ? calls : calls.filter((_, callIndex) => callIndex !== index);
        });
        return;
      case 'chart':
        this.activeChartSignal.set(event.chart);
        this.pendingCharts = [...this.pendingCharts, event.chart];
        return;
      case 'error':
        this.errorSignal.set(event.message);
        return;
      case 'connection-lost':
        // A live connection dropped (ICE failed): end the session with a
        // retryable error rather than dying silently.
        this.isModelSpeakingSignal.set(false);
        this.activeToolCallsSignal.set([]);
        this.errorSignal.set('Realtime connection lost');
        this.connectionStateSignal.set('error');
        return;
    }
  }

  private resetSessionState(): void {
    this.liveTranscriptSignal.set('');
    this.activeToolCallsSignal.set([]);
    this.activeChartSignal.set(null);
    this.isModelSpeakingSignal.set(false);
    this.errorSignal.set(null);
    this.permissionDeniedSignal.set(false);
    this.notAvailableSignal.set(false);
    this.conversationIdSignal.set(null);
    this.completedTurns = [];
    this.pendingCharts = [];
  }

  private toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Realtime session failed';
  }
}
