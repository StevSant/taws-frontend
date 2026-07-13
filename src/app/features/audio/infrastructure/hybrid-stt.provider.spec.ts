import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppConfigService } from '../../../core';
import { SpeechToTextProvider } from '../domain';
import { HttpSttProvider } from './http-stt.provider';
import { HybridSpeechToTextProvider } from './hybrid-stt.provider';
import { WebSpeechSttProvider } from './web-speech-stt.provider';

interface FakeParts {
  sttEnabled: boolean;
  httpSupported?: boolean;
  webSupported?: boolean;
  httpStop?: () => Promise<string>;
  webStop?: () => Promise<string>;
}

function buildProvider(parts: FakeParts) {
  const httpStart = vi.fn(() => Promise.resolve());
  const httpStop = vi.fn(parts.httpStop ?? (() => Promise.resolve('http transcript')));
  const httpCancel = vi.fn();
  const webStart = vi.fn(() => Promise.resolve());
  const webStop = vi.fn(parts.webStop ?? (() => Promise.resolve('web transcript')));
  const webCancel = vi.fn();

  TestBed.configureTestingModule({
    providers: [
      HybridSpeechToTextProvider,
      { provide: AppConfigService, useValue: { sttEnabled: parts.sttEnabled } },
      {
        provide: HttpSttProvider,
        useValue: {
          start: httpStart,
          stop: httpStop,
          cancel: httpCancel,
          supported: parts.httpSupported ?? true,
        },
      },
      {
        provide: WebSpeechSttProvider,
        useValue: {
          start: webStart,
          stop: webStop,
          cancel: webCancel,
          supported: parts.webSupported ?? true,
        },
      },
    ],
  });

  const provider = TestBed.inject(HybridSpeechToTextProvider);
  return { provider, httpStart, httpStop, httpCancel, webStart, webStop, webCancel };
}

describe('HybridSpeechToTextProvider', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('is bound as a SpeechToTextProvider', () => {
    const { provider } = buildProvider({ sttEnabled: true });
    expect(provider).toBeInstanceOf(SpeechToTextProvider);
  });

  it('supported is true when the HTTP path works and STT is enabled', () => {
    const { provider } = buildProvider({ sttEnabled: true, httpSupported: true });
    expect(provider.supported).toBe(true);
  });

  it('supported falls back to Web Speech support when STT is disabled', () => {
    const { provider } = buildProvider({
      sttEnabled: false,
      httpSupported: true,
      webSupported: false,
    });
    expect(provider.supported).toBe(false);
  });

  it('supported is false when neither path is available', () => {
    const { provider } = buildProvider({
      sttEnabled: true,
      httpSupported: false,
      webSupported: false,
    });
    expect(provider.supported).toBe(false);
  });

  it('uses the HTTP provider when STT is enabled and it succeeds', async () => {
    const { provider, httpStart, httpStop, webStart, webStop } = buildProvider({
      sttEnabled: true,
      httpStop: () => Promise.resolve('server text'),
    });

    await provider.start();
    const transcript = await provider.stop();

    expect(httpStart).toHaveBeenCalled();
    expect(httpStop).toHaveBeenCalled();
    expect(webStart).not.toHaveBeenCalled();
    expect(webStop).not.toHaveBeenCalled();
    expect(transcript).toBe('server text');
  });

  it('surfaces an HTTP transcription failure instead of starting a late empty fallback', async () => {
    const { provider, httpStop, webStart, webStop } = buildProvider({
      sttEnabled: true,
      httpStop: () => Promise.reject(new Error('503')),
      webStop: () => Promise.resolve('fallback text'),
    });

    await provider.start();
    await expect(provider.stop()).rejects.toThrow('503');

    expect(httpStop).toHaveBeenCalled();
    expect(webStart).not.toHaveBeenCalled();
    expect(webStop).not.toHaveBeenCalled();
  });

  it('skips the HTTP provider entirely when STT is disabled', async () => {
    const { provider, httpStart, httpStop, webStart, webStop } = buildProvider({
      sttEnabled: false,
      webStop: () => Promise.resolve('web only'),
    });

    await provider.start();
    const transcript = await provider.stop();

    expect(httpStart).not.toHaveBeenCalled();
    expect(httpStop).not.toHaveBeenCalled();
    expect(webStart).toHaveBeenCalled();
    expect(webStop).toHaveBeenCalled();
    expect(transcript).toBe('web only');
  });

  it('rejects on stop() when neither path can produce a transcript', async () => {
    const { provider } = buildProvider({
      sttEnabled: true,
      httpStop: () => Promise.reject(new Error('503')),
      webSupported: false,
    });

    await provider.start();
    await expect(provider.stop()).rejects.toThrow();
  });

  it('cancel() cancels both underlying providers', () => {
    const { provider, httpCancel, webCancel } = buildProvider({ sttEnabled: true });
    provider.cancel();
    expect(httpCancel).toHaveBeenCalled();
    expect(webCancel).toHaveBeenCalled();
  });
});
