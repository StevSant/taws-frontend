import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSpeechSttProvider } from './web-speech-stt.provider';

/**
 * Minimal fake of the Web Speech `SpeechRecognition` object. The test drives
 * `onresult` / `onerror` / `onend` by hand and inspects start/stop/abort.
 */
class FakeRecognition {
  static last: FakeRecognition | null = null;
  continuous = false;
  interimResults = false;
  lang = '';
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  // Real recognition.stop() ends asynchronously; the test drives onend/onerror
  // explicitly so it can model both success and error orderings.
  stop = vi.fn();
  abort = vi.fn();

  constructor() {
    FakeRecognition.last = this;
  }
}

/** Builds a SpeechRecognition-shaped results event. */
function resultsEvent(transcripts: string[]): unknown {
  return {
    resultIndex: 0,
    results: transcripts.map((t) => [{ transcript: t }]),
  };
}

describe('WebSpeechSttProvider', () => {
  let provider: WebSpeechSttProvider;

  beforeEach(() => {
    FakeRecognition.last = null;
    vi.stubGlobal('SpeechRecognition', FakeRecognition);
    vi.stubGlobal('webkitSpeechRecognition', undefined);

    TestBed.configureTestingModule({ providers: [WebSpeechSttProvider] });
    provider = TestBed.inject(WebSpeechSttProvider);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports supported when a SpeechRecognition constructor exists', () => {
    expect(provider.supported).toBe(true);
  });

  it('reports unsupported when neither SpeechRecognition variant exists', () => {
    vi.stubGlobal('SpeechRecognition', undefined);
    vi.stubGlobal('webkitSpeechRecognition', undefined);
    expect(provider.supported).toBe(false);
  });

  it('start() begins recognition', async () => {
    await provider.start();
    expect(FakeRecognition.last?.start).toHaveBeenCalled();
  });

  it('accumulates results and resolves the final transcript on stop()', async () => {
    await provider.start();
    const recognition = FakeRecognition.last!;
    recognition.onresult?.(resultsEvent(['hola ', 'mundo']));

    const stopped = provider.stop();
    recognition.onend?.();
    await expect(stopped).resolves.toBe('hola mundo');
  });

  it('cancel() aborts recognition', async () => {
    await provider.start();
    provider.cancel();
    expect(FakeRecognition.last?.abort).toHaveBeenCalled();
  });

  it('stop() rejects when recognition errors', async () => {
    await provider.start();
    const recognition = FakeRecognition.last!;
    const stopped = provider.stop();
    recognition.onerror?.({ error: 'network' });
    await expect(stopped).rejects.toThrow();
  });

  it('start() rejects when the Web Speech API is unavailable', async () => {
    vi.stubGlobal('SpeechRecognition', undefined);
    vi.stubGlobal('webkitSpeechRecognition', undefined);
    await expect(provider.start()).rejects.toThrow();
  });
});
