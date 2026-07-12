/**
 * Domain-level events the transport (RealtimeWebrtcService) emits to the store.
 *
 * These are decoupled from OpenAI's wire event names on purpose: the
 * infrastructure adapter translates raw `oai-events` data-channel messages into
 * this small, stable union so the application store never depends on OpenAI's
 * event schema. One variant per concern, discriminated by `kind`.
 */
export type RealtimeEvent =
  | { kind: 'transcript-delta'; delta: string }
  | { kind: 'speaking-changed'; speaking: boolean }
  | { kind: 'tool-call-started'; name: string }
  | { kind: 'tool-call-finished'; name: string }
  | { kind: 'error'; message: string }
  | { kind: 'connection-lost' };
