import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TextToSpeechProvider } from '../domain';
import { AudioPlaybackStore } from './audio-playback-store';

/** Controllable fake port: `speak` returns a promise we resolve/reject by hand. */
class DeferredTtsProvider extends TextToSpeechProvider {
  resolveSpeak: (() => void) | null = null;
  rejectSpeak: ((error: Error) => void) | null = null;
  stop = vi.fn();

  speak = vi.fn((): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      this.resolveSpeak = resolve;
      this.rejectSpeak = reject;
    });
  });
}

describe('AudioPlaybackStore', () => {
  let store: AudioPlaybackStore;
  let tts: DeferredTtsProvider;

  beforeEach(() => {
    tts = new DeferredTtsProvider();
    TestBed.configureTestingModule({
      providers: [AudioPlaybackStore, { provide: TextToSpeechProvider, useValue: tts }],
    });
    store = TestBed.inject(AudioPlaybackStore);
  });

  it('starts idle', () => {
    expect(store.isPlaying()).toBe(false);
    expect(store.activeMessageId()).toBeNull();
    expect(store.error()).toBeNull();
    expect(store.erroredMessageId()).toBeNull();
  });

  it('marks playing and tracks the active message while speaking', () => {
    void store.play('msg-1', 'hello');
    expect(store.isPlaying()).toBe(true);
    expect(store.activeMessageId()).toBe('msg-1');
    expect(tts.speak).toHaveBeenCalledWith('hello');
  });

  it('clears playing state when speech finishes', async () => {
    const playback = store.play('msg-1', 'hello');
    tts.resolveSpeak?.();
    await playback;

    expect(store.isPlaying()).toBe(false);
    expect(store.activeMessageId()).toBeNull();
    expect(store.error()).toBeNull();
  });

  it('sets an error and clears playing state when speech fails', async () => {
    const playback = store.play('msg-1', 'hello');
    tts.rejectSpeak?.(new Error('no audio'));
    await playback;

    expect(store.isPlaying()).toBe(false);
    expect(store.activeMessageId()).toBeNull();
    expect(store.error()).not.toBeNull();
  });

  it('tracks the errored message id so the banner scopes to the failed message', async () => {
    const playback = store.play('msg-old', 'hello');
    tts.rejectSpeak?.(new Error('no audio'));
    await playback;

    expect(store.erroredMessageId()).toBe('msg-old');
  });

  it('clears the errored message id when a new playback starts', async () => {
    const first = store.play('msg-old', 'hello');
    tts.rejectSpeak?.(new Error('boom'));
    await first;
    expect(store.erroredMessageId()).toBe('msg-old');

    void store.play('msg-new', 'world');
    expect(store.erroredMessageId()).toBeNull();
  });

  it('stop() halts the provider and resets state', async () => {
    const playback = store.play('msg-1', 'hello');
    store.stop();
    tts.resolveSpeak?.();
    await playback;

    expect(tts.stop).toHaveBeenCalled();
    expect(store.isPlaying()).toBe(false);
    expect(store.activeMessageId()).toBeNull();
  });

  it('clicking play on the currently-playing message stops it (toggle off)', () => {
    void store.play('msg-1', 'hello');
    expect(store.isPlaying()).toBe(true);

    void store.play('msg-1', 'hello');
    expect(tts.stop).toHaveBeenCalled();
    expect(store.isPlaying()).toBe(false);
    expect(store.activeMessageId()).toBeNull();
  });

  it('clears a prior error when a new playback starts', async () => {
    const first = store.play('msg-1', 'hello');
    tts.rejectSpeak?.(new Error('boom'));
    await first;
    expect(store.error()).not.toBeNull();

    void store.play('msg-2', 'world');
    expect(store.error()).toBeNull();
  });
});
