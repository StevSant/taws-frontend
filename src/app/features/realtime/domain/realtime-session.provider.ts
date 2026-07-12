import { RealtimeEvent } from './realtime-event.model';

/**
 * Domain port for a realtime voice session transport. An abstract class (not an
 * interface) so it can double as an Angular DI token — bind a concrete adapter
 * via `{ provide: RealtimeSessionProvider, useClass: RealtimeWebrtcService }`.
 *
 * Application code (RealtimeStore) depends on this abstraction only; it never
 * imports the WebRTC adapter directly. `start()` mints an ephemeral session,
 * negotiates the peer connection, and resolves once the data channel is open;
 * `stop()` tears everything down and releases the microphone. Session events
 * (transcript, speaking, tool calls, errors) are delivered through `onEvent`.
 */
export abstract class RealtimeSessionProvider {
  /**
   * Registers the single event sink the store consumes. Must be called before
   * `start()`. Replaces any previously registered listener.
   */
  abstract onEvent(listener: (event: RealtimeEvent) => void): void;

  /**
   * Mints an ephemeral session, opens the WebRTC peer connection and data
   * channel, and begins streaming microphone audio. Resolves when the session
   * is live. Rejects if the session cannot be minted (e.g. backend 503) or
   * media/negotiation fails — callers surface this as an error state.
   */
  abstract start(): Promise<void>;

  /** Tears down the peer connection, closes the data channel, and releases the mic. Safe to call when idle. */
  abstract stop(): void;
}
