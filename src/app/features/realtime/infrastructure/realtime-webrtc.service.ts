import { Injectable, inject } from '@angular/core';
import { AppConfigService, AuthTokenService } from '../../../core';
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
      return await navigator.mediaDevices.getUserMedia({ audio: true });
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

  /** Re-asserts the server-authored tool schema on the open channel. */
  private configureSession(): void {
    this.send({
      type: OAI_CLIENT_EVENT.sessionUpdate,
      session: { tools: this.tools },
    });
  }

  private handleServerEvent(event: MessageEvent): void {
    const parsed = this.parseEvent(event.data);
    if (!parsed) {
      return;
    }

    switch (parsed['type']) {
      case OAI_EVENT.transcriptDelta: {
        const delta = parsed['delta'];
        if (typeof delta === 'string') {
          this.emit({ kind: 'transcript-delta', delta });
        }
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
      this.send({
        type: OAI_CLIENT_EVENT.conversationItemCreate,
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify(result.output),
        },
      });
      this.send({ type: OAI_CLIENT_EVENT.responseCreate });
    } catch (error: unknown) {
      this.emit({ kind: 'error', message: this.toErrorMessage(error) });
    } finally {
      this.emit({ kind: 'tool-call-finished', name });
    }
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
