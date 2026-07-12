import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppConfigService, AuthTokenService } from '../../../core';
import { HttpTtsProvider } from './http-tts.provider';

/**
 * Fake HTMLAudioElement so play() resolves deterministically without a real
 * media pipeline. The constructed instance is captured on `lastAudio`.
 */
class FakeAudio {
  static lastAudio: FakeAudio | null = null;
  src: string;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();

  constructor(src: string) {
    this.src = src;
    FakeAudio.lastAudio = this;
  }
}

/** Lets pending microtasks (fetch + blob awaits) settle before assertions. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('HttpTtsProvider', () => {
  let provider: HttpTtsProvider;
  let authToken: AuthTokenService;
  const fetchMock = vi.fn();
  const createObjectURL = vi.fn(() => 'blob:fake-url');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    FakeAudio.lastAudio = null;
    fetchMock.mockReset();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();

    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('Audio', FakeAudio);
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    TestBed.configureTestingModule({
      providers: [
        HttpTtsProvider,
        { provide: AppConfigService, useValue: { apiBaseUrl: 'http://test.local' } },
        AuthTokenService,
      ],
    });
    provider = TestBed.inject(HttpTtsProvider);
    authToken = TestBed.inject(AuthTokenService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs the text to /api/v1/chat/speak with the bearer token', async () => {
    authToken.setToken('jwt-123');
    fetchMock.mockResolvedValue({ ok: true, status: 200, blob: () => Promise.resolve(new Blob()) });

    const playback = provider.speak('hello world');
    await flush();
    FakeAudio.lastAudio?.onended?.();
    await playback;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://test.local/api/v1/chat/speak');
    expect(init.method).toBe('POST');
    expect(init.headers['Authorization']).toBe('Bearer jwt-123');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ text: 'hello world' });
  });

  it('plays the returned blob and revokes the object URL when playback ends', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, blob: () => Promise.resolve(new Blob()) });

    const playback = provider.speak('hi');
    await flush();
    expect(FakeAudio.lastAudio?.play).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();

    FakeAudio.lastAudio?.onended?.();
    await playback;

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
  });

  it('throws when the response is 503 so the store can fall back', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      blob: () => Promise.resolve(new Blob()),
    });

    await expect(provider.speak('hi')).rejects.toThrow();
    expect(FakeAudio.lastAudio).toBeNull();
  });

  it('omits the Authorization header when there is no token', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, blob: () => Promise.resolve(new Blob()) });

    const playback = provider.speak('hi');
    await flush();
    FakeAudio.lastAudio?.onended?.();
    await playback;

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['Authorization']).toBeUndefined();
  });

  it('stop() pauses the active audio and revokes its URL', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, blob: () => Promise.resolve(new Blob()) });

    const playback = provider.speak('hi');
    await flush();
    provider.stop();

    expect(FakeAudio.lastAudio?.pause).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
    await playback;
  });
});
