import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppConfigService, AuthTokenService } from '../../../core';
import { PERMISSION_DENIED_MESSAGE, RealtimeEvent, RealtimeNotAvailableError } from '../domain';
import { OAI_DATA_CHANNEL, OPENAI_REALTIME_CALLS_URL } from './realtime-openai-events';
import { RealtimeWebrtcService } from './realtime-webrtc.service';

/** Fake data channel that records sent frames and exposes open/message hooks. */
class FakeDataChannel {
  readyState = 'open';
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  sent: string[] = [];
  closed = false;
  send = vi.fn((payload: string) => {
    this.sent.push(payload);
  });
  close = vi.fn(() => {
    this.closed = true;
  });

  emitOpen(): void {
    this.onopen?.();
  }
  emitMessage(data: unknown): void {
    this.onmessage?.({ data } as MessageEvent);
  }
}

/** Fake RTCPeerConnection capturing the negotiation calls the service makes. */
class FakePeerConnection {
  static last: FakePeerConnection | null = null;
  channel = new FakeDataChannel();
  ontrack: ((event: RTCTrackEvent) => void) | null = null;
  addTrack = vi.fn();
  createDataChannel = vi.fn((_name: string) => this.channel);
  createOffer = vi.fn(() => Promise.resolve({ type: 'offer', sdp: 'OFFER_SDP' }));
  setLocalDescription = vi.fn(() => Promise.resolve());
  setRemoteDescription = vi.fn(() => Promise.resolve());
  close = vi.fn();

  constructor() {
    FakePeerConnection.last = this;
  }
}

class FakeTrack {
  stop = vi.fn();
  kind = 'audio';
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('RealtimeWebrtcService', () => {
  let service: RealtimeWebrtcService;
  let authToken: AuthTokenService;
  const fetchMock = vi.fn();
  const getUserMock = vi.fn();
  let micTrack: FakeTrack;
  let micStream: { getAudioTracks: () => FakeTrack[]; getTracks: () => FakeTrack[] };

  beforeEach(() => {
    FakePeerConnection.last = null;
    fetchMock.mockReset();
    getUserMock.mockReset();

    micTrack = new FakeTrack();
    micStream = {
      getAudioTracks: () => [micTrack],
      getTracks: () => [micTrack],
    };
    getUserMock.mockResolvedValue(micStream);

    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('RTCPeerConnection', FakePeerConnection);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: getUserMock } });

    TestBed.configureTestingModule({
      providers: [
        RealtimeWebrtcService,
        { provide: AppConfigService, useValue: { apiBaseUrl: 'http://test.local' } },
        AuthTokenService,
      ],
    });
    service = TestBed.inject(RealtimeWebrtcService);
    authToken = TestBed.inject(AuthTokenService);
    authToken.setToken('jwt-abc');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.querySelectorAll('audio').forEach((el) => el.remove());
  });

  /** Mint response then OpenAI SDP answer, in call order. */
  function primeHandshake(): void {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            client_secret: 'ek_secret_123',
            model: 'gpt-realtime-mini',
            expires_at: 9999,
            tools: [{ name: 'get_market_data' }],
          }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve('ANSWER_SDP') });
  }

  it('mints the session with the JWT then POSTs the SDP offer to OpenAI with the ephemeral secret', async () => {
    primeHandshake();

    await service.start();

    const [mintUrl, mintInit] = fetchMock.mock.calls[0];
    expect(mintUrl).toBe('http://test.local/api/v1/chat/realtime/session');
    expect(mintInit.method).toBe('POST');
    expect(mintInit.headers['Authorization']).toBe('Bearer jwt-abc');

    const [sdpUrl, sdpInit] = fetchMock.mock.calls[1];
    expect(sdpUrl).toContain(OPENAI_REALTIME_CALLS_URL);
    expect(sdpUrl).toContain('model=gpt-realtime-mini');
    expect(sdpInit.headers['Authorization']).toBe('Bearer ek_secret_123');
    expect(sdpInit.headers['Content-Type']).toBe('application/sdp');
    expect(sdpInit.body).toBe('OFFER_SDP');

    const pc = FakePeerConnection.last!;
    expect(pc.createDataChannel).toHaveBeenCalledWith(OAI_DATA_CHANNEL);
    expect(pc.addTrack).toHaveBeenCalledTimes(1);
    expect(pc.setLocalDescription).toHaveBeenCalled();
    expect(pc.setRemoteDescription).toHaveBeenCalledWith({ type: 'answer', sdp: 'ANSWER_SDP' });
  });

  it('never sends the ephemeral secret to the backend nor the JWT to OpenAI', async () => {
    primeHandshake();
    await service.start();

    const [, mintInit] = fetchMock.mock.calls[0];
    const [, sdpInit] = fetchMock.mock.calls[1];
    expect(mintInit.headers['Authorization']).not.toContain('ek_');
    expect(sdpInit.headers['Authorization']).not.toContain('jwt-abc');
  });

  it('throws a distinct RealtimeNotAvailableError when the session mint returns 503', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });

    await expect(service.start()).rejects.toBeInstanceOf(RealtimeNotAvailableError);
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it('throws a generic error (not not-available) for a non-503 mint failure', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(service.start()).rejects.toSatisfy(
      (error: unknown) => error instanceof Error && !(error instanceof RealtimeNotAvailableError),
    );
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it('sends a session.update carrying the server tool schema when the channel opens', async () => {
    primeHandshake();
    await service.start();

    FakePeerConnection.last!.channel.emitOpen();

    const sent = FakePeerConnection.last!.channel.sent.map((s) => JSON.parse(s));
    const update = sent.find((m) => m.type === 'session.update');
    expect(update).toBeDefined();
    expect(update.session.tools).toEqual([{ name: 'get_market_data' }]);
    expect(update.session.tool_choice).toBe('required');
  });

  it('requires a real tool call when the user starts speaking', async () => {
    primeHandshake();
    await service.start();
    const channel = FakePeerConnection.last!.channel;

    channel.emitMessage(JSON.stringify({ type: 'input_audio_buffer.speech_started' }));

    const sent = channel.sent.map((message) => JSON.parse(message));
    const update = sent.find(
      (message) => message.type === 'session.update' && message.session.tool_choice === 'required',
    );
    expect(update).toBeDefined();
  });

  it('renders a chart directly from transcribed chart intent and a follow-up symbol', async () => {
    primeHandshake();
    const events: RealtimeEvent[] = [];
    service.onEvent((event) => events.push(event));
    await service.start();
    const channel = FakePeerConnection.last!.channel;
    const chart = {
      type: 'line',
      series: [{ name: 'BTC', points: [{ x: '2026-01-01', y: 64_000 }], bars: [] }],
      xAxis: { label: 'Date', type: 'time' },
      yAxis: { label: 'Price', type: 'value', format: 'currency' },
      meta: {
        title: 'BTC price',
        source: 'test',
        timeframe: '1m',
        timeframes: [],
        request: { kind: 'price_line', symbols: ['BTC'], timeframe: '1m' },
      },
    };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ call_id: 'ui_chart', output: { summary: 'BTC', chart } }),
    });

    channel.emitMessage(
      JSON.stringify({
        type: 'conversation.item.input_audio_transcription.completed',
        transcript: 'Quiero que me muestres un gráfico.',
      }),
    );
    channel.emitMessage(
      JSON.stringify({
        type: 'conversation.item.input_audio_transcription.completed',
        transcript: 'Bitcoin.',
      }),
    );
    await flush();

    const chartCall = fetchMock.mock.calls.find(
      ([url]) => url === 'http://test.local/api/v1/chat/realtime/tool',
    );
    expect(JSON.parse(chartCall![1].body)).toMatchObject({
      name: 'render_price_chart',
      arguments: { instrument_symbol: 'BTC', timeframe: '1m', chart_type: 'line' },
    });
    expect(events).toContainEqual({ kind: 'chart', chart });
  });

  it('renders the chart even when the assistant claims it cannot show one', async () => {
    primeHandshake();
    const events: RealtimeEvent[] = [];
    service.onEvent((event) => events.push(event));
    await service.start();
    const channel = FakePeerConnection.last!.channel;
    const chart = {
      type: 'line',
      series: [{ name: 'BTC', points: [{ x: '2026-01-01', y: 64_000 }], bars: [] }],
      xAxis: { label: 'Date', type: 'time' },
      yAxis: { label: 'Price', type: 'value' },
      meta: {
        title: 'BTC price',
        source: 'test',
        timeframe: '1m',
        timeframes: [],
        request: { kind: 'price_line', symbols: ['BTC'], timeframe: '1m' },
      },
    };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ call_id: 'ui_chart', output: { summary: 'BTC', chart } }),
    });

    channel.emitMessage(
      JSON.stringify({
        type: 'response.output_audio_transcript.delta',
        delta: 'No puedo mostrar un gráfico de Bitcoin en pantalla.',
      }),
    );
    await flush();

    expect(events).toContainEqual({ kind: 'chart', chart });
  });

  it('relays a function_call event to /realtime/tool and sends function_call_output + response.create', async () => {
    primeHandshake();
    await service.start();
    const channel = FakePeerConnection.last!.channel;

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ call_id: 'call_1', output: { price: 190.12 } }),
    });

    channel.emitMessage(
      JSON.stringify({
        type: 'response.function_call_arguments.done',
        call_id: 'call_1',
        name: 'get_market_data',
        arguments: JSON.stringify({ symbol: 'AAPL' }),
      }),
    );
    await flush();

    const toolCall = fetchMock.mock.calls.find(
      ([url]) => url === 'http://test.local/api/v1/chat/realtime/tool',
    );
    expect(toolCall).toBeDefined();
    const toolInit = toolCall![1];
    expect(toolInit.headers['Authorization']).toBe('Bearer jwt-abc');
    expect(JSON.parse(toolInit.body)).toEqual({
      call_id: 'call_1',
      name: 'get_market_data',
      arguments: { symbol: 'AAPL' },
    });

    const sent = channel.sent.map((s) => JSON.parse(s));
    const output = sent.find((m) => m.type === 'conversation.item.create');
    expect(output.item.type).toBe('function_call_output');
    expect(output.item.call_id).toBe('call_1');
    expect(JSON.parse(output.item.output)).toEqual({ price: 190.12 });
    expect(sent.some((m) => m.type === 'response.create')).toBe(true);
  });

  it('emits chart output to the UI while sending only its summary back to the model', async () => {
    primeHandshake();
    const events: RealtimeEvent[] = [];
    service.onEvent((event) => events.push(event));
    await service.start();
    const channel = FakePeerConnection.last!.channel;
    const chart = {
      type: 'line',
      series: [{ name: 'AAPL', points: [{ x: '2026-01-01', y: 190 }], bars: [] }],
      xAxis: { label: 'Date', type: 'time' },
      yAxis: { label: 'Price', type: 'value', format: 'currency' },
      meta: {
        title: 'AAPL price',
        source: 'test',
        timeframe: '1m',
        timeframes: [],
        request: { kind: 'price_line', symbols: ['AAPL'], timeframe: '1m' },
      },
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          call_id: 'chart_1',
          output: { summary: 'Rendered AAPL price.', chart },
        }),
    });

    channel.emitMessage(
      JSON.stringify({
        type: 'response.function_call_arguments.done',
        call_id: 'chart_1',
        name: 'render_price_chart',
        arguments: JSON.stringify({ instrument_symbol: 'AAPL' }),
      }),
    );
    await flush();

    expect(events).toContainEqual({ kind: 'chart', chart });
    const sent = channel.sent.map((message) => JSON.parse(message));
    const output = sent.find((message) => message.type === 'conversation.item.create');
    expect(JSON.parse(output.item.output)).toEqual({ summary: 'Rendered AAPL price.' });
  });

  it('continues only once after every parallel tool call has completed', async () => {
    primeHandshake();
    await service.start();
    const channel = FakePeerConnection.last!.channel;

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ call_id: 'parallel_1', output: { price: 190 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ call_id: 'parallel_2', output: { signals: [] } }),
      });

    channel.emitMessage(
      JSON.stringify({
        type: 'response.function_call_arguments.done',
        call_id: 'parallel_1',
        name: 'get_market_data',
        arguments: JSON.stringify({ symbol: 'AAPL' }),
      }),
    );
    channel.emitMessage(
      JSON.stringify({
        type: 'response.function_call_arguments.done',
        call_id: 'parallel_2',
        name: 'list_signals',
        arguments: JSON.stringify({ symbol: 'AAPL' }),
      }),
    );
    await flush();

    const sent = channel.sent.map((message) => JSON.parse(message));
    expect(sent.filter((message) => message.type === 'conversation.item.create')).toHaveLength(2);
    expect(sent.filter((message) => message.type === 'response.create')).toHaveLength(1);
  });

  it('emits tool-call start/finish and transcript/speaking events to the listener', async () => {
    primeHandshake();
    const events: RealtimeEvent[] = [];
    service.onEvent((e) => events.push(e));
    await service.start();
    const channel = FakePeerConnection.last!.channel;

    channel.emitMessage(
      JSON.stringify({ type: 'response.output_audio_transcript.delta', delta: 'Apple ' }),
    );
    channel.emitMessage(JSON.stringify({ type: 'response.output_audio.started' }));
    channel.emitMessage(JSON.stringify({ type: 'response.output_audio.done' }));

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ call_id: 'c1', output: {} }),
    });
    channel.emitMessage(
      JSON.stringify({
        type: 'response.function_call_arguments.done',
        call_id: 'c1',
        name: 'get_news',
        arguments: '{}',
      }),
    );
    await flush();

    expect(events).toContainEqual({ kind: 'transcript-delta', delta: 'Apple ' });
    expect(events).toContainEqual({ kind: 'speaking-changed', speaking: true });
    expect(events).toContainEqual({ kind: 'speaking-changed', speaking: false });
    expect(events).toContainEqual({ kind: 'tool-call-started', name: 'get_news' });
    expect(events).toContainEqual({ kind: 'tool-call-finished', name: 'get_news' });
  });

  it('emits only completed user and assistant turns for history capture', async () => {
    primeHandshake();
    const events: RealtimeEvent[] = [];
    service.onEvent((event) => events.push(event));
    await service.start();
    const channel = FakePeerConnection.last!.channel;

    channel.emitMessage(
      JSON.stringify({
        type: 'conversation.item.input_audio_transcription.completed',
        transcript: '  What is Apple trading at?  ',
      }),
    );
    channel.emitMessage(
      JSON.stringify({ type: 'response.output_audio_transcript.delta', delta: 'Apple is at ' }),
    );
    channel.emitMessage(
      JSON.stringify({
        type: 'response.output_audio_transcript.done',
        transcript: '  Apple is at 190 dollars.  ',
      }),
    );

    expect(events.filter((event) => event.kind === 'turn-completed')).toEqual([
      {
        kind: 'turn-completed',
        turn: { role: 'user', content: 'What is Apple trading at?' },
      },
      {
        kind: 'turn-completed',
        turn: { role: 'assistant', content: 'Apple is at 190 dollars.' },
      },
    ]);
  });

  it('emits an error event when the tool relay fails but still finishes the tool call', async () => {
    primeHandshake();
    const events: RealtimeEvent[] = [];
    service.onEvent((e) => events.push(e));
    await service.start();

    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    FakePeerConnection.last!.channel.emitMessage(
      JSON.stringify({
        type: 'response.function_call_arguments.done',
        call_id: 'c9',
        name: 'get_market_data',
        arguments: '{}',
      }),
    );
    await flush();

    expect(events.some((e) => e.kind === 'error')).toBe(true);
    expect(events).toContainEqual({ kind: 'tool-call-finished', name: 'get_market_data' });
  });

  it('sends a function_call_output with an error payload + response.create when the tool call fails (non-OK)', async () => {
    primeHandshake();
    await service.start();
    const channel = FakePeerConnection.last!.channel;

    // Backend rejects the tool call (e.g. 422 validation error).
    fetchMock.mockResolvedValueOnce({ ok: false, status: 422 });

    channel.emitMessage(
      JSON.stringify({
        type: 'response.function_call_arguments.done',
        call_id: 'call_fail',
        name: 'get_market_data',
        arguments: JSON.stringify({ symbol: 'AAPL' }),
      }),
    );
    await flush();

    // The model must not be left hanging: an error output is returned for the
    // same call_id, followed by response.create so it can recover.
    const sent = channel.sent.map((s) => JSON.parse(s));
    const output = sent.find((m) => m.type === 'conversation.item.create');
    expect(output).toBeDefined();
    expect(output.item.type).toBe('function_call_output');
    expect(output.item.call_id).toBe('call_fail');
    const parsedOutput = JSON.parse(output.item.output);
    expect(parsedOutput.error).toBeTruthy();
    expect(sent.some((m) => m.type === 'response.create')).toBe(true);
  });

  it('stop() releases the mic tracks and closes the peer connection and data channel', async () => {
    primeHandshake();
    await service.start();
    const pc = FakePeerConnection.last!;

    service.stop();

    expect(micTrack.stop).toHaveBeenCalled();
    expect(pc.channel.close).toHaveBeenCalled();
    expect(pc.close).toHaveBeenCalled();
  });

  it('stop() is safe to call before any resource has been acquired', () => {
    expect(() => service.stop()).not.toThrow();
  });

  it('tears down resources acquired after a stop() that races an in-flight start()', async () => {
    primeHandshake();

    // getUserMedia is held open so stop() runs while start() is mid-flight,
    // AFTER the peer connection exists but BEFORE the mic resolves.
    let resolveMedia: (stream: unknown) => void = () => {};
    getUserMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveMedia = resolve;
      }),
    );

    const starting = service.start();
    // Let start() advance past mintSession + RTCPeerConnection creation.
    await flush();
    const pc = FakePeerConnection.last!;

    service.stop();

    // Resolve the mic AFTER stop(); start() must release it instead of leaking.
    resolveMedia(micStream);
    await starting;

    expect(micTrack.stop).toHaveBeenCalled();
    expect(pc.close).toHaveBeenCalled();
    expect(FakePeerConnection.last!.setRemoteDescription).not.toHaveBeenCalled();
  });

  it('releases partially-acquired resources and rejects when getUserMedia is denied', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          client_secret: 'ek_secret_123',
          model: 'gpt-realtime-mini',
          expires_at: 9999,
          tools: [],
        }),
    });
    const denied = new DOMException('Permission denied', 'NotAllowedError');
    getUserMock.mockRejectedValueOnce(denied);

    await expect(service.start()).rejects.toBeTruthy();

    const pc = FakePeerConnection.last!;
    expect(pc.close).toHaveBeenCalled();
    expect(pc.setRemoteDescription).not.toHaveBeenCalled();
  });

  it('emits a distinct permission-denied error when getUserMedia is blocked', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          client_secret: 'ek_secret_123',
          model: 'gpt-realtime-mini',
          expires_at: 9999,
          tools: [],
        }),
    });
    const events: RealtimeEvent[] = [];
    service.onEvent((e) => events.push(e));
    getUserMock.mockRejectedValueOnce(new DOMException('Permission denied', 'NotAllowedError'));

    await expect(service.start()).rejects.toBeTruthy();

    expect(events).toContainEqual({ kind: 'error', message: PERMISSION_DENIED_MESSAGE });
  });
});
