import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NOT_AVAILABLE_MESSAGE,
  PERMISSION_DENIED_MESSAGE,
  RealtimeEvent,
  RealtimeNotAvailableError,
  RealtimePermissionDeniedError,
  RealtimeSessionProvider,
} from '../domain';
import { RealtimeStore } from './realtime.store';

/**
 * Controllable fake transport. `start` resolves/rejects on demand and captures
 * the store's event listener so tests can push realtime events synchronously.
 */
class FakeRealtimeProvider extends RealtimeSessionProvider {
  listener: ((event: RealtimeEvent) => void) | null = null;
  onEvent = vi.fn((listener: (event: RealtimeEvent) => void) => {
    this.listener = listener;
  });
  resolveStart: (() => void) | null = null;
  rejectStart: ((error: Error) => void) | null = null;
  start = vi.fn(
    (): Promise<void> =>
      new Promise<void>((resolve, reject) => {
        this.resolveStart = resolve;
        this.rejectStart = reject;
      }),
  );
  stop = vi.fn();

  emit(event: RealtimeEvent): void {
    this.listener?.(event);
  }
}

describe('RealtimeStore', () => {
  let store: RealtimeStore;
  let provider: FakeRealtimeProvider;

  beforeEach(() => {
    provider = new FakeRealtimeProvider();
    TestBed.configureTestingModule({
      providers: [RealtimeStore, { provide: RealtimeSessionProvider, useValue: provider }],
    });
    store = TestBed.inject(RealtimeStore);
  });

  it('starts idle with empty state', () => {
    expect(store.connectionState()).toBe('idle');
    expect(store.liveTranscript()).toBe('');
    expect(store.activeToolCall()).toBeNull();
    expect(store.isModelSpeaking()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('registers its event listener with the provider on construction', () => {
    expect(provider.onEvent).toHaveBeenCalledTimes(1);
  });

  it('transitions to connecting then live across a successful start', async () => {
    const started = store.start();
    expect(store.connectionState()).toBe('connecting');

    provider.resolveStart?.();
    await started;

    expect(provider.start).toHaveBeenCalledTimes(1);
    expect(store.connectionState()).toBe('live');
    expect(store.error()).toBeNull();
  });

  it('ends a live session with a retryable error when the connection drops', async () => {
    const started = store.start();
    provider.resolveStart?.();
    await started;
    expect(store.connectionState()).toBe('live');

    provider.emit({ kind: 'connection-lost' });

    expect(store.connectionState()).toBe('error');
    expect(store.error()).not.toBeNull();
    expect(store.isModelSpeaking()).toBe(false);
  });

  it('is a no-op when start is called while already connecting', async () => {
    void store.start();
    void store.start();
    expect(provider.start).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when start is called while already live', async () => {
    const started = store.start();
    provider.resolveStart?.();
    await started;

    void store.start();
    expect(provider.start).toHaveBeenCalledTimes(1);
  });

  it('goes to error state and records the message when start fails (e.g. 503)', async () => {
    const started = store.start();
    provider.rejectStart?.(new Error('Realtime unavailable (503)'));
    await started;

    expect(store.connectionState()).toBe('error');
    expect(store.error()).toContain('503');
    expect(provider.stop).toHaveBeenCalled();
  });

  it('accumulates transcript deltas in order', async () => {
    const started = store.start();
    provider.resolveStart?.();
    await started;

    provider.emit({ kind: 'transcript-delta', delta: 'Apple ' });
    provider.emit({ kind: 'transcript-delta', delta: 'is trading ' });
    provider.emit({ kind: 'transcript-delta', delta: 'at 190.' });

    expect(store.liveTranscript()).toBe('Apple is trading at 190.');
  });

  it('reflects model speaking state from speaking-changed events', async () => {
    const started = store.start();
    provider.resolveStart?.();
    await started;

    provider.emit({ kind: 'speaking-changed', speaking: true });
    expect(store.isModelSpeaking()).toBe(true);

    provider.emit({ kind: 'speaking-changed', speaking: false });
    expect(store.isModelSpeaking()).toBe(false);
  });

  it('sets and clears the active tool call around a tool round trip', async () => {
    const started = store.start();
    provider.resolveStart?.();
    await started;

    provider.emit({ kind: 'tool-call-started', name: 'get_market_data' });
    expect(store.activeToolCall()).toBe('get_market_data');

    provider.emit({ kind: 'tool-call-finished', name: 'get_market_data' });
    expect(store.activeToolCall()).toBeNull();
  });

  it('surfaces error events into the error signal without dropping the session', async () => {
    const started = store.start();
    provider.resolveStart?.();
    await started;

    provider.emit({ kind: 'error', message: 'tool relay failed' });
    expect(store.error()).toBe('tool relay failed');
    expect(store.connectionState()).toBe('live');
  });

  it('stop() tears down the provider and resets all state', async () => {
    const started = store.start();
    provider.resolveStart?.();
    await started;

    provider.emit({ kind: 'transcript-delta', delta: 'partial' });
    provider.emit({ kind: 'speaking-changed', speaking: true });
    provider.emit({ kind: 'tool-call-started', name: 'get_news' });

    store.stop();

    expect(provider.stop).toHaveBeenCalled();
    expect(store.connectionState()).toBe('idle');
    expect(store.liveTranscript()).toBe('');
    expect(store.isModelSpeaking()).toBe(false);
    expect(store.activeToolCall()).toBeNull();
  });

  it('flags permission-denied distinctly when start rejects with a mic-permission error', async () => {
    const started = store.start();
    provider.rejectStart?.(new RealtimePermissionDeniedError());
    await started;

    expect(store.connectionState()).toBe('error');
    expect(store.permissionDenied()).toBe(true);
    expect(store.error()).toBe(PERMISSION_DENIED_MESSAGE);
  });

  it('does not flag permission-denied for a generic start failure', async () => {
    const started = store.start();
    provider.rejectStart?.(new Error('Realtime unavailable (503)'));
    await started;

    expect(store.connectionState()).toBe('error');
    expect(store.permissionDenied()).toBe(false);
  });

  it('maps a not-available failure to the distinct not-available state (never generic error)', async () => {
    const started = store.start();
    provider.rejectStart?.(new RealtimeNotAvailableError());
    await started;

    expect(store.connectionState()).toBe('not-available');
    expect(store.notAvailable()).toBe(true);
    expect(store.error()).toBe(NOT_AVAILABLE_MESSAGE);
    expect(store.permissionDenied()).toBe(false);
    expect(provider.stop).toHaveBeenCalled();
  });

  it('does not flag not-available for a generic start failure', async () => {
    const started = store.start();
    provider.rejectStart?.(new Error('boom'));
    await started;

    expect(store.connectionState()).toBe('error');
    expect(store.notAvailable()).toBe(false);
  });

  it('does not flag not-available for a permission-denied failure', async () => {
    const started = store.start();
    provider.rejectStart?.(new RealtimePermissionDeniedError());
    await started;

    expect(store.connectionState()).toBe('error');
    expect(store.notAvailable()).toBe(false);
    expect(store.permissionDenied()).toBe(true);
  });

  it('clears the not-available flag when a new session starts', async () => {
    const failed = store.start();
    provider.rejectStart?.(new RealtimeNotAvailableError());
    await failed;
    expect(store.notAvailable()).toBe(true);

    store.start();
    expect(store.notAvailable()).toBe(false);
    expect(store.connectionState()).toBe('connecting');
  });

  it('clears the permission-denied flag when a new session starts', async () => {
    const failed = store.start();
    provider.rejectStart?.(new RealtimePermissionDeniedError());
    await failed;
    expect(store.permissionDenied()).toBe(true);

    store.start();
    expect(store.permissionDenied()).toBe(false);
  });

  it('clears a prior error and stale transcript when a new session starts', async () => {
    const failed = store.start();
    provider.rejectStart?.(new Error('boom'));
    await failed;
    expect(store.error()).not.toBeNull();

    const started = store.start();
    expect(store.error()).toBeNull();
    expect(store.liveTranscript()).toBe('');
    provider.resolveStart?.();
    await started;
    expect(store.connectionState()).toBe('live');
  });
});
