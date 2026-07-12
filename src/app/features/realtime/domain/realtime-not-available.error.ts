/**
 * Distinct error for the "the deployment has realtime voice turned off" failure
 * mode: the backend mint endpoint answered `503 Service Unavailable` because the
 * realtime feature is not enabled server-side.
 *
 * This is NOT a transient connection failure and NOT something the user can fix
 * by retrying or granting a permission — so it earns its own type. Both the
 * transport (which throws it on a 503) and the store (which detects it via
 * `instanceof` to surface a calm "not available right now" state rather than a
 * red "failed, retry" alarm) depend on this one stable type instead of sniffing
 * a status-code string.
 */
export const NOT_AVAILABLE_MESSAGE = 'Live voice is not enabled for this deployment.';

export class RealtimeNotAvailableError extends Error {
  constructor(message: string = NOT_AVAILABLE_MESSAGE) {
    super(message);
    this.name = 'RealtimeNotAvailableError';
  }
}
