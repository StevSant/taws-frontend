import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSpeechTtsProvider } from './web-speech-tts.provider';

class FakeUtterance {
  static last: FakeUtterance | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {
    FakeUtterance.last = this;
  }
}

describe('WebSpeechTtsProvider', () => {
  let provider: WebSpeechTtsProvider;
  const speak = vi.fn();
  const cancel = vi.fn();

  beforeEach(() => {
    FakeUtterance.last = null;
    speak.mockReset();
    cancel.mockReset();

    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    vi.stubGlobal('speechSynthesis', { speak, cancel });

    TestBed.configureTestingModule({ providers: [WebSpeechTtsProvider] });
    provider = TestBed.inject(WebSpeechTtsProvider);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('speaks the text via speechSynthesis and resolves on utterance end', async () => {
    const playback = provider.speak('hola mundo');

    expect(speak).toHaveBeenCalledTimes(1);
    expect(FakeUtterance.last?.text).toBe('hola mundo');

    FakeUtterance.last?.onend?.();
    await expect(playback).resolves.toBeUndefined();
  });

  it('rejects when the utterance errors', async () => {
    const playback = provider.speak('boom');
    FakeUtterance.last?.onerror?.();
    await expect(playback).rejects.toThrow();
  });

  it('stop() cancels the active synthesis and resolves the pending promise', async () => {
    const playback = provider.speak('largo');
    provider.stop();

    expect(cancel).toHaveBeenCalled();
    await expect(playback).resolves.toBeUndefined();
  });

  it('rejects immediately when the Web Speech API is unavailable', async () => {
    vi.stubGlobal('speechSynthesis', undefined);
    await expect(provider.speak('x')).rejects.toThrow();
  });
});
