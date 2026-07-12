import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppConfigService } from '../../../core';
import { TextToSpeechProvider } from '../domain';
import { HttpTtsProvider } from './http-tts.provider';
import { HybridTextToSpeechProvider } from './hybrid-tts.provider';
import { WebSpeechTtsProvider } from './web-speech-tts.provider';

function buildProvider(ttsEnabled: boolean, primarySpeak: () => Promise<void>) {
  const httpSpeak = vi.fn(primarySpeak);
  const httpStop = vi.fn();
  const webSpeak = vi.fn(() => Promise.resolve());
  const webStop = vi.fn();

  TestBed.configureTestingModule({
    providers: [
      HybridTextToSpeechProvider,
      { provide: AppConfigService, useValue: { ttsEnabled } },
      { provide: HttpTtsProvider, useValue: { speak: httpSpeak, stop: httpStop } },
      { provide: WebSpeechTtsProvider, useValue: { speak: webSpeak, stop: webStop } },
    ],
  });

  const provider = TestBed.inject(HybridTextToSpeechProvider);
  return { provider, httpSpeak, httpStop, webSpeak, webStop };
}

describe('HybridTextToSpeechProvider', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('is bound as a TextToSpeechProvider', () => {
    const { provider } = buildProvider(true, () => Promise.resolve());
    expect(provider).toBeInstanceOf(TextToSpeechProvider);
  });

  it('uses the HTTP provider when TTS is enabled and it succeeds', async () => {
    const { provider, httpSpeak, webSpeak } = buildProvider(true, () => Promise.resolve());
    await provider.speak('hi');
    expect(httpSpeak).toHaveBeenCalledWith('hi');
    expect(webSpeak).not.toHaveBeenCalled();
  });

  it('falls back to Web Speech when the HTTP provider throws (e.g. 503)', async () => {
    const { provider, httpSpeak, webSpeak } = buildProvider(true, () =>
      Promise.reject(new Error('503')),
    );
    await provider.speak('hi');
    expect(httpSpeak).toHaveBeenCalledWith('hi');
    expect(webSpeak).toHaveBeenCalledWith('hi');
  });

  it('skips the HTTP provider entirely when TTS is disabled', async () => {
    const { provider, httpSpeak, webSpeak } = buildProvider(false, () => Promise.resolve());
    await provider.speak('hi');
    expect(httpSpeak).not.toHaveBeenCalled();
    expect(webSpeak).toHaveBeenCalledWith('hi');
  });

  it('stop() stops both underlying providers', () => {
    const { provider, httpStop, webStop } = buildProvider(true, () => Promise.resolve());
    provider.stop();
    expect(httpStop).toHaveBeenCalled();
    expect(webStop).toHaveBeenCalled();
  });
});
