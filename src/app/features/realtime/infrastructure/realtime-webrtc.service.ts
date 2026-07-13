import { Injectable, inject } from '@angular/core';
import { AppConfigService, AuthTokenService } from '../../../core';
import { ChartSpec } from '../../../shared/charts';
import {
  RealtimeEvent,
  RealtimeNotAvailableError,
  RealtimePermissionDeniedError,
  RealtimeSessionProvider,
} from '../domain';
import {
  OAI_CLIENT_EVENT,
  OAI_DATA_CHANNEL,
  OAI_EVENT,
  OPENAI_REALTIME_CALLS_URL,
} from './realtime-openai-events';

const SESSION_PATH = '/api/v1/chat/realtime/session';
const TOOL_PATH = '/api/v1/chat/realtime/tool';
const CHART_INTENT_PATTERN =
  /\b(gr[aá]fic[oa]s?|chart|charts|plot|visual(?:izaci[oó]n)?|mostrar|mu[eé]strame|generar|genera|dibujar|show|create)\b/i;
const SYMBOL_ALIASES: Readonly<Record<string, string>> = {
  bitcoin: 'BTC',
  btc: 'BTC',
  ethereum: 'ETH',
  ether: 'ETH',
  eth: 'ETH',
  apple: 'AAPL',
  aapl: 'AAPL',
  amazon: 'AMZN',
  amzn: 'AMZN',
  nvidia: 'NVDA',
  nvda: 'NVDA',
  tesla: 'TSLA',
  tsla: 'TSLA',
  microsoft: 'MSFT',
  msft: 'MSFT',
  google: 'GOOGL',
  alphabet: 'GOOGL',
  spy: 'SPY',
  's&p': 'SPY',
};

interface RealtimeSessionResponse {
  client_secret: string;
  model: string;
  expires_at: number;
  tools: unknown[];
}

/**
 * WebRTC transport adapter implementing `RealtimeSessionProvider` against the
 * OpenAI Realtime API + the TAWS backend.
 *
 * Two connections, two credentials (the security invariant):
 * - The Supabase JWT (from AuthTokenService) is the Bearer for the two BACKEND
 *   endpoints only: `POST /api/v1/chat/realtime/session` (mints the ephemeral
 *   `ek_*` secret) and `POST /api/v1/chat/realtime/tool` (executes function
 *   calls server-side with the verified user).
 * - The ephemeral `ek_*` client secret is the Bearer for the OpenAI WebRTC
 *   signaling POST ONLY. The real OpenAI key never reaches the browser.
 *
 * Flow: mint session -> getUserMedia(audio) -> RTCPeerConnection + addTrack +
 * `oai-events` data channel -> createOffer -> POST SDP to `/v1/realtime/calls`
 * -> setRemoteDescription(answer). Once the channel opens, a `session.update`
 * re-asserts the server-authored tool schema. A `response.function_call_arguments.done`
 * event is relayed to `/realtime/tool`; the result is sent back as a
 * `function_call_output` item followed by `response.create`. Remote audio is
 * attached to a hidden autoplay `<audio>`. `stop()` releases the mic and closes
 * the peer connection + data channel.
 */
@Injectable()
export class RealtimeWebrtcService extends RealtimeSessionProvider {
  private readonly config = inject(AppConfigService);
  private readonly authToken = inject(AuthTokenService);

  private listener: ((event: RealtimeEvent) => void) | null = null;
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private micStream: MediaStream | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private tools: unknown[] = [];
  private pendingToolCalls = 0;
  private continuationScheduled = false;
  /** Tool calls the model has made since the last user turn — reset on user speech. */
  private toolCallsThisTurn = 0;
  /** Hard cap on tool calls per user turn: a runaway-loop backstop for the realtime path. */
  private readonly maxToolCallsPerTurn = 8;
  private visualRequestPending = false;
  private lastDirectChartRequest: { key: string; at: number } | null = null;
  private assistantTranscriptBuffer = '';

  /**
   * Bumped by every `stop()`. `start()` captures the value it began with and,
   * after each `await`, aborts (releasing whatever it just acquired) if the
   * counter moved — so a `stop()` that races an in-flight `start()` never leaks
   * a mic track or an RTCPeerConnection acquired after the teardown.
   */
  private startGeneration = 0;

  onEvent(listener: (event: RealtimeEvent) => void): void {
    this.listener = listener;
  }

  async start(): Promise<void> {
    const generation = this.startGeneration;

    try {
      const session = await this.mintSession();
      if (this.isCancelled(generation)) {
        return;
      }
      this.tools = session.tools;

      const pc = new RTCPeerConnection({ iceServers: this.config.realtimeIceServers });
      this.pc = pc;
      pc.onconnectionstatechange = () => this.handleConnectionStateChange(pc);
      this.attachRemoteAudio(pc);

      this.micStream = await this.acquireMicrophone();
      if (this.isCancelled(generation)) {
        return;
      }
      for (const track of this.micStream.getAudioTracks()) {
        pc.addTrack(track, this.micStream);
      }

      const channel = pc.createDataChannel(OAI_DATA_CHANNEL);
      this.dataChannel = channel;
      channel.onopen = () => this.configureSession();
      channel.onmessage = (event) => this.handleServerEvent(event);

      const offer = await pc.createOffer();
      if (this.isCancelled(generation)) {
        return;
      }
      await pc.setLocalDescription(offer);
      if (this.isCancelled(generation)) {
        return;
      }

      const answerSdp = await this.exchangeSdp(
        offer.sdp ?? '',
        session.client_secret,
        session.model,
      );
      if (this.isCancelled(generation)) {
        return;
      }
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    } catch (error: unknown) {
      // Release anything acquired before the failure; the store also lands in
      // `error`, but the transport must not leak the mic/pc on its own.
      this.teardown();
      throw error;
    }
  }

  /**
   * Requests the mic, translating a permission block into a distinct domain
   * error so the store/UI can tell the user to allow the mic rather than showing
   * a generic connection failure. Emits the same distinct error to listeners.
   */
  private async acquireMicrophone(): Promise<MediaStream> {
    try {
      // Request echo cancellation explicitly so the mic doesn't pick up Midas's own voice
      // from the speakers and feed it back as "user speech" (which re-triggers the model and
      // can loop). Defaults usually enable these, but on speakers being explicit matters.
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (error: unknown) {
      if (this.isPermissionDenied(error)) {
        const denied = new RealtimePermissionDeniedError();
        this.emit({ kind: 'error', message: denied.message });
        throw denied;
      }
      throw error;
    }
  }

  private isPermissionDenied(error: unknown): boolean {
    return (
      error instanceof DOMException &&
      (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')
    );
  }

  /**
   * True once a `stop()` has raced this in-flight `start()`. When cancelled,
   * `start()` tears down every resource acquired so far and aborts.
   */
  private isCancelled(generation: number): boolean {
    if (this.startGeneration === generation) {
      return false;
    }
    this.teardown();
    return true;
  }

  stop(): void {
    this.startGeneration += 1;
    this.teardown();
  }

  /** Releases the mic, closes the data channel + peer connection, removes the audio sink. */
  private teardown(): void {
    this.pendingToolCalls = 0;
    this.continuationScheduled = false;
    this.visualRequestPending = false;
    this.lastDirectChartRequest = null;
    this.assistantTranscriptBuffer = '';
    if (this.dataChannel) {
      this.dataChannel.onopen = null;
      this.dataChannel.onmessage = null;
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.micStream) {
      for (const track of this.micStream.getTracks()) {
        track.stop();
      }
      this.micStream = null;
    }
    if (this.pc) {
      this.pc.onconnectionstatechange = null;
      this.pc.close();
      this.pc = null;
    }
    if (this.audioElement) {
      this.audioElement.srcObject = null;
      this.audioElement.remove();
      this.audioElement = null;
    }
  }

  /**
   * Mints the ephemeral session from the backend using the Supabase JWT.
   *
   * A `503` means the deployment has realtime voice turned off — a distinct,
   * non-transient condition, so it throws the typed `RealtimeNotAvailableError`
   * the store maps to a calm "not available" state (not a red retry alarm). Any
   * other non-2xx is a generic transient failure the user can retry.
   */
  private async mintSession(): Promise<RealtimeSessionResponse> {
    const response = await fetch(`${this.config.apiBaseUrl}${SESSION_PATH}`, {
      method: 'POST',
      headers: this.backendHeaders(),
    });

    if (response.status === 503) {
      throw new RealtimeNotAvailableError();
    }

    if (!response.ok) {
      throw new Error(`Realtime session request failed with status ${response.status}`);
    }

    return (await response.json()) as RealtimeSessionResponse;
  }

  /** POSTs the SDP offer to OpenAI with the EPHEMERAL secret and returns the answer SDP. */
  private async exchangeSdp(
    offerSdp: string,
    clientSecret: string,
    model: string,
  ): Promise<string> {
    const response = await fetch(
      `${OPENAI_REALTIME_CALLS_URL}?model=${encodeURIComponent(model)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          'Content-Type': 'application/sdp',
        },
        body: offerSdp,
      },
    );

    if (!response.ok) {
      throw new Error(`Realtime SDP exchange failed with status ${response.status}`);
    }

    return response.text();
  }

  /**
   * Re-asserts the server-authored tool schema on the open channel. `tool_choice` is `auto`,
   * never `required`: forcing a tool on every turn makes the model call one even for a
   * greeting ("¿estás ahí?") and — because each tool result triggers another forced turn —
   * loops forever narrating preambles. Grounding is guided by the instructions instead.
   */
  private configureSession(): void {
    this.send({
      type: OAI_CLIENT_EVENT.sessionUpdate,
      session: { tools: this.tools, tool_choice: 'auto' },
    });
  }

  private handleServerEvent(event: MessageEvent): void {
    const parsed = this.parseEvent(event.data);
    if (!parsed) {
      return;
    }

    switch (parsed['type']) {
      case OAI_EVENT.error: {
        const error = this.asRecord(parsed['error']);
        const message =
          typeof error?.['message'] === 'string' ? error['message'] : 'Realtime protocol error';
        this.emit({ kind: 'error', message });
        return;
      }
      case OAI_EVENT.inputSpeechStarted:
        // New user turn — reset the per-turn tool budget.
        this.toolCallsThisTurn = 0;
        return;
      case OAI_EVENT.inputTranscriptDone: {
        const transcript = parsed['transcript'];
        if (typeof transcript === 'string') {
          this.emitCompletedTurn('user', transcript);
          void this.handleInputTranscript(transcript);
        }
        return;
      }
      case OAI_EVENT.transcriptDelta: {
        const delta = parsed['delta'];
        if (typeof delta === 'string') {
          this.emit({ kind: 'transcript-delta', delta });
          this.assistantTranscriptBuffer = `${this.assistantTranscriptBuffer}${delta}`.slice(
            -2_000,
          );
          void this.handleInputTranscript(this.assistantTranscriptBuffer);
        }
        return;
      }
      case OAI_EVENT.transcriptDone: {
        const transcript =
          typeof parsed['transcript'] === 'string'
            ? parsed['transcript']
            : this.assistantTranscriptBuffer;
        this.emitCompletedTurn('assistant', transcript);
        this.assistantTranscriptBuffer = '';
        return;
      }
      case OAI_EVENT.audioStarted:
        this.emit({ kind: 'speaking-changed', speaking: true });
        return;
      case OAI_EVENT.audioDone:
        this.emit({ kind: 'speaking-changed', speaking: false });
        return;
      case OAI_EVENT.functionCallDone:
        void this.relayFunctionCall(parsed);
        return;
    }
  }

  /**
   * Relays a completed model function call to the backend tool endpoint and
   * sends the result back over the data channel, then asks the model to
   * continue. The backend re-validates name + args and takes the user from the
   * verified JWT — the browser is never trusted for tool selection.
   */
  private async relayFunctionCall(parsed: Record<string, unknown>): Promise<void> {
    const callId = typeof parsed['call_id'] === 'string' ? parsed['call_id'] : '';
    const name = typeof parsed['name'] === 'string' ? parsed['name'] : '';
    const args = this.parseArguments(parsed['arguments']);
    if (!callId || !name) {
      return;
    }

    this.pendingToolCalls += 1;
    this.toolCallsThisTurn += 1;
    this.emit({ kind: 'tool-call-started', name });
    try {
      const response = await fetch(`${this.config.apiBaseUrl}${TOOL_PATH}`, {
        method: 'POST',
        headers: this.backendHeaders({ json: true }),
        body: JSON.stringify({ call_id: callId, name, arguments: args }),
      });

      if (!response.ok) {
        throw new Error(`Realtime tool request failed with status ${response.status}`);
      }

      const result = (await response.json()) as { call_id: string; output: unknown };
      const output = this.asRecord(result.output);
      const chart = output?.['chart'];
      if (this.isChartSpec(chart)) {
        this.emit({ kind: 'chart', chart });
      }
      const modelOutput =
        typeof output?.['summary'] === 'string' ? { summary: output['summary'] } : result.output;
      this.sendToolOutput(callId, modelOutput);
    } catch (error: unknown) {
      const message = this.toErrorMessage(error);
      this.sendToolOutput(callId, { error: message });
      this.emit({ kind: 'error', message });
    } finally {
      this.emit({ kind: 'tool-call-finished', name });
      this.pendingToolCalls = Math.max(0, this.pendingToolCalls - 1);
      this.scheduleContinuation();
    }
  }

  private sendToolOutput(callId: string, output: unknown): void {
    this.send({
      type: OAI_CLIENT_EVENT.conversationItemCreate,
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(output),
      },
    });
  }

  private async handleInputTranscript(transcript: string): Promise<void> {
    if (CHART_INTENT_PATTERN.test(transcript)) {
      this.visualRequestPending = true;
    }

    const symbols = this.extractRequestedSymbols(transcript);
    if (!this.visualRequestPending || symbols.length === 0) {
      return;
    }
    this.visualRequestPending = false;

    const toolName = symbols.length > 1 ? 'render_comparison_chart' : 'render_price_chart';
    const key = `${toolName}:${symbols.join(',')}`;
    const now = Date.now();
    if (this.lastDirectChartRequest?.key === key && now - this.lastDirectChartRequest.at < 10_000) {
      return;
    }
    this.lastDirectChartRequest = { key, at: now };

    const args =
      symbols.length > 1
        ? { instrument_symbols: symbols, timeframe: '1m' }
        : { instrument_symbol: symbols[0], timeframe: '1m', chart_type: 'line' };
    const callId = `ui_chart_${now}`;
    this.emit({ kind: 'tool-call-started', name: toolName });
    try {
      const response = await fetch(`${this.config.apiBaseUrl}${TOOL_PATH}`, {
        method: 'POST',
        headers: this.backendHeaders({ json: true }),
        body: JSON.stringify({ call_id: callId, name: toolName, arguments: args }),
      });
      if (!response.ok) {
        throw new Error(`Chart request failed with status ${response.status}`);
      }
      const result = (await response.json()) as { output: unknown };
      const output = this.asRecord(result.output);
      const chart = output?.['chart'];
      if (!this.isChartSpec(chart)) {
        throw new Error('Chart tool returned no visual specification');
      }
      this.emit({ kind: 'chart', chart });
    } catch (error: unknown) {
      const message = this.toErrorMessage(error);
      this.emit({ kind: 'error', message });
      // Never leave the model hanging on an unanswered function call: return a
      // function_call_output carrying the error for this call_id, then ask the
      // model to continue so it can recover (retry, ask the user, or move on).
      this.send({
        type: OAI_CLIENT_EVENT.conversationItemCreate,
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify({ error: message }),
        },
      });
      this.send({ type: OAI_CLIENT_EVENT.responseCreate });
    } finally {
      this.emit({ kind: 'tool-call-finished', name: toolName });
    }
  }

  private extractRequestedSymbols(transcript: string): string[] {
    const normalized = transcript.toLocaleLowerCase();
    const symbols = new Set<string>();
    for (const [alias, symbol] of Object.entries(SYMBOL_ALIASES)) {
      if (normalized.includes(alias)) {
        symbols.add(symbol);
      }
    }
    return [...symbols];
  }

  private scheduleContinuation(): void {
    if (this.pendingToolCalls > 0 || this.continuationScheduled) {
      return;
    }
    this.continuationScheduled = true;
    queueMicrotask(() => {
      this.continuationScheduled = false;
      if (this.pendingToolCalls === 0) {
        // Runaway-loop backstop: after too many tool calls in one user turn, force this
        // response to be text-only (`none`) so the model MUST answer instead of calling yet
        // another tool. Otherwise let it decide (`auto`).
        const forceAnswer = this.toolCallsThisTurn >= this.maxToolCallsPerTurn;
        this.send({
          type: OAI_CLIENT_EVENT.responseCreate,
          response: { tool_choice: forceAnswer ? 'none' : 'auto' },
        });
      }
    });
  }

  /**
   * A live peer connection that transitions to `failed` is dead (ICE gave up —
   * typically a NAT/keepalive drop). Surface a distinct `connection-lost` event
   * so the store ends the session with a retryable error instead of going
   * silent, then release the mic + peer connection.
   */
  private handleConnectionStateChange(pc: RTCPeerConnection): void {
    if (pc.connectionState === 'failed') {
      this.emit({ kind: 'connection-lost' });
      this.teardown();
    }
  }

  private attachRemoteAudio(pc: RTCPeerConnection): void {
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.hidden = true;
    document.body.appendChild(audio);
    this.audioElement = audio;

    pc.ontrack = (event) => {
      if (this.audioElement) {
        this.audioElement.srcObject = event.streams[0] ?? null;
      }
    };
  }

  private send(payload: Record<string, unknown>): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(payload));
    }
  }

  private emit(event: RealtimeEvent): void {
    this.listener?.(event);
  }

  private emitCompletedTurn(role: 'user' | 'assistant', content: string): void {
    const trimmed = content.trim();
    if (trimmed) {
      this.emit({ kind: 'turn-completed', turn: { role, content: trimmed } });
    }
  }

  private parseEvent(data: unknown): Record<string, unknown> | null {
    if (typeof data !== 'string') {
      return null;
    }
    try {
      const parsed = JSON.parse(data);
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  private parseArguments(raw: unknown): Record<string, unknown> {
    if (typeof raw !== 'string') {
      return {};
    }
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
  }

  private isChartSpec(value: unknown): value is ChartSpec {
    const chart = this.asRecord(value);
    const meta = this.asRecord(chart?.['meta']);
    return (
      chart !== null &&
      typeof chart['type'] === 'string' &&
      Array.isArray(chart['series']) &&
      this.asRecord(chart['xAxis']) !== null &&
      this.asRecord(chart['yAxis']) !== null &&
      meta !== null &&
      typeof meta['title'] === 'string'
    );
  }

  private backendHeaders(options?: { json?: boolean }): Record<string, string> {
    const headers: Record<string, string> = {};
    if (options?.json) {
      headers['Content-Type'] = 'application/json';
    }
    const token = this.authToken.currentToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Realtime tool relay failed';
  }
}
