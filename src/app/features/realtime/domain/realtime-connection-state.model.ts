/**
 * Lifecycle of a realtime voice session, surfaced by RealtimeStore for the UI.
 *
 * - `idle`: no session; the Talk button is ready to start one.
 * - `connecting`: minting the ephemeral session + negotiating WebRTC.
 * - `live`: the data channel is open and audio is flowing both ways.
 * - `error`: the last start/session attempt failed transiently (see
 *   RealtimeStore.error) — a retry may succeed.
 * - `not-available`: the backend has realtime voice turned off (mint returned
 *   503). Distinct from `error` so the UI can show a calm "not available right
 *   now" message instead of a red "failed, retry" alarm.
 */
export type RealtimeConnectionState = 'idle' | 'connecting' | 'live' | 'error' | 'not-available';
