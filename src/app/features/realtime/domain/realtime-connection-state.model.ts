/**
 * Lifecycle of a realtime voice session, surfaced by RealtimeStore for the UI.
 *
 * - `idle`: no session; the Talk button is ready to start one.
 * - `connecting`: minting the ephemeral session + negotiating WebRTC.
 * - `live`: the data channel is open and audio is flowing both ways.
 * - `error`: the last start/session attempt failed (see RealtimeStore.error).
 */
export type RealtimeConnectionState = 'idle' | 'connecting' | 'live' | 'error';
