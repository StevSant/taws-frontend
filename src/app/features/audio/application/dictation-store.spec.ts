import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SpeechToTextProvider } from '../domain';
import { DictationStore } from './dictation-store';

/** Controllable fake port whose `stop` resolves/rejects on demand. */
class FakeSttProvider extends SpeechToTextProvider {
  supported = true;
  start = vi.fn(() => Promise.resolve());
  cancel = vi.fn();
  resolveStop: ((text: string) => void) | null = null;
  rejectStop: ((error: Error) => void) | null = null;
  stop = vi.fn((): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      this.resolveStop = resolve;
      this.rejectStop = reject;
    });
  });
}

describe('DictationStore', () => {
  let store: DictationStore;
  let stt: FakeSttProvider;

  beforeEach(() => {
    stt = new FakeSttProvider();
    TestBed.configureTestingModule({
      providers: [DictationStore, { provide: SpeechToTextProvider, useValue: stt }],
    });
    store = TestBed.inject(DictationStore);
  });

  it('starts idle and reflects provider support', () => {
    expect(store.isRecording()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.isSupported()).toBe(true);
  });

  it('reports unsupported when the provider is unsupported', () => {
    stt.supported = false;
    expect(store.isSupported()).toBe(false);
  });

  it('marks recording when dictation starts', async () => {
    await store.startDictation();
    expect(stt.start).toHaveBeenCalled();
    expect(store.isRecording()).toBe(true);
  });

  it('returns the transcript and clears recording on stop', async () => {
    await store.startDictation();
    const stopped = store.stopDictation();
    stt.resolveStop?.('hello world');
    const transcript = await stopped;

    expect(transcript).toBe('hello world');
    expect(store.isRecording()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('sets an error and returns empty string when transcription fails', async () => {
    await store.startDictation();
    const stopped = store.stopDictation();
    stt.rejectStop?.(new Error('no mic'));
    const transcript = await stopped;

    expect(transcript).toBe('');
    expect(store.isRecording()).toBe(false);
    expect(store.error()).not.toBeNull();
  });

  it('sets an error when start fails (e.g. permission denied)', async () => {
    stt.start.mockRejectedValueOnce(new Error('Permission denied'));
    await store.startDictation();

    expect(store.isRecording()).toBe(false);
    expect(store.error()).not.toBeNull();
  });

  it('clears a prior error when a new dictation starts', async () => {
    stt.start.mockRejectedValueOnce(new Error('boom'));
    await store.startDictation();
    expect(store.error()).not.toBeNull();

    await store.startDictation();
    expect(store.error()).toBeNull();
  });

  it('cancelDictation() aborts the provider and resets recording', async () => {
    await store.startDictation();
    store.cancelDictation();

    expect(stt.cancel).toHaveBeenCalled();
    expect(store.isRecording()).toBe(false);
  });

  it('stopDictation() when not recording returns empty string without calling the provider', async () => {
    const transcript = await store.stopDictation();
    expect(transcript).toBe('');
    expect(stt.stop).not.toHaveBeenCalled();
  });
});
