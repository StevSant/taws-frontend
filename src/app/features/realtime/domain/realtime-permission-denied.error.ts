/**
 * Distinct error for the one failure mode the user can actually fix themselves:
 * the browser blocked microphone access (getUserMedia rejected with
 * `NotAllowedError` / `PermissionDeniedError`).
 *
 * Kept in the domain so both the transport (which throws it) and the store
 * (which detects it via `instanceof` to surface a mic-permission hint) depend on
 * one stable type rather than sniffing a generic connection error message.
 */
export const PERMISSION_DENIED_MESSAGE = 'Microphone access was blocked. Allow the mic to talk.';

export class RealtimePermissionDeniedError extends Error {
  constructor(message: string = PERMISSION_DENIED_MESSAGE) {
    super(message);
    this.name = 'RealtimePermissionDeniedError';
  }
}
