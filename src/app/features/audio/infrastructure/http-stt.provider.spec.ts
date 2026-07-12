import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppConfigService, AuthTokenService } from '../../../core';
import { HttpSttProvider } from './http-stt.provider';

/** Fake MediaStreamTrack that records whether it was stopped (mic release). */
class FakeTrack {
  stop = vi.fn();
}

/** Fake MediaStream exposing tracks so the adapter can release the mic. */
class FakeStream {
  tracks: FakeTrack[];
  constructor(tracks: FakeTrack[]) {
    this.tracks = tracks;
  }
  getTracks(): FakeTrack[] {
    return this.tracks;
  }
}

/**
 * Fake MediaRecorder: captures the handlers, lets the test push a data chunk
 * and drive `stop()` -> `onstop` deterministically.
 */
class FakeMediaRecorder {
  static last: FakeMediaRecorder | null = null;
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  state: 'inactive' | 'recording' = 'inactive';
  start = vi.fn(() => {
    this.state = 'recording';
  });
  stop = vi.fn(() => {
    this.state = 'inactive';
    this.onstop?.();
  });
  constructor(public stream: FakeStream) {
    FakeMediaRecorder.last = this;
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('HttpSttProvider', () => {
  let provider: HttpSttProvider;
  let authToken: AuthTokenService;
  let track: FakeTrack;
  let stream: FakeStream;
  const fetchMock = vi.fn();
  const getUserMedia = vi.fn();

  beforeEach(() => {
    FakeMediaRecorder.last = null;
    fetchMock.mockReset();
    getUserMedia.mockReset();
    track = new FakeTrack();
    stream = new FakeStream([track]);
    getUserMedia.mockResolvedValue(stream);

    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });

    TestBed.configureTestingModule({
      providers: [
        HttpSttProvider,
        { provide: AppConfigService, useValue: { apiBaseUrl: 'http://test.local' } },
        AuthTokenService,
      ],
    });
    provider = TestBed.inject(HttpSttProvider);
    authToken = TestBed.inject(AuthTokenService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports supported when getUserMedia and MediaRecorder exist', () => {
    expect(provider.supported).toBe(true);
  });

  it('reports unsupported when MediaRecorder is missing', () => {
    vi.stubGlobal('MediaRecorder', undefined);
    expect(provider.supported).toBe(false);
  });

  it('start() requests the mic and begins recording', async () => {
    await provider.start();

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(FakeMediaRecorder.last?.start).toHaveBeenCalled();
    expect(FakeMediaRecorder.last?.state).toBe('recording');
  });

  it('stop() POSTs the recorded audio as multipart and returns the transcript', async () => {
    authToken.setToken('jwt-123');
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ text: 'hello world' }),
    });

    await provider.start();
    const recorder = FakeMediaRecorder.last!;
    recorder.ondataavailable?.({ data: new Blob(['audio-bytes']) });

    const transcript = await provider.stop();

    expect(transcript).toBe('hello world');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://test.local/api/v1/chat/transcribe');
    expect(init.method).toBe('POST');
    expect(init.headers['Authorization']).toBe('Bearer jwt-123');
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get('file')).toBeInstanceOf(Blob);
  });

  it('stop() releases the microphone tracks', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ text: 'x' }),
    });

    await provider.start();
    FakeMediaRecorder.last!.ondataavailable?.({ data: new Blob(['a']) });
    await provider.stop();

    expect(track.stop).toHaveBeenCalled();
  });

  it('stop() throws on a non-OK response (e.g. 503) so the store can fall back', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({}),
    });

    await provider.start();
    FakeMediaRecorder.last!.ondataavailable?.({ data: new Blob(['a']) });

    await expect(provider.stop()).rejects.toThrow();
    // Mic must still be released even on failure.
    expect(track.stop).toHaveBeenCalled();
  });

  it('start() rejects and releases the mic when permission is denied', async () => {
    getUserMedia.mockRejectedValue(new Error('Permission denied'));

    await expect(provider.start()).rejects.toThrow();
    await flush();
    expect(FakeMediaRecorder.last).toBeNull();
  });

  it('releases the mic when MediaRecorder construction fails after getUserMedia resolves', async () => {
    // getUserMedia already handed us a live mic stream; if the recorder can't be
    // built the stream must still be released so the device isn't left on.
    vi.stubGlobal(
      'MediaRecorder',
      class {
        constructor() {
          throw new Error('MediaRecorder unavailable');
        }
      },
    );

    await expect(provider.start()).rejects.toThrow('MediaRecorder unavailable');
    expect(track.stop).toHaveBeenCalled();
  });

  it('cancel() stops recording and releases the mic without POSTing', async () => {
    await provider.start();
    provider.cancel();

    expect(track.stop).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('omits the Authorization header when there is no token', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ text: 'x' }),
    });

    await provider.start();
    FakeMediaRecorder.last!.ondataavailable?.({ data: new Blob(['a']) });
    await provider.stop();

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['Authorization']).toBeUndefined();
  });
});
