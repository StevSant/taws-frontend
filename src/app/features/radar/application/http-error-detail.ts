import { HttpErrorResponse } from '@angular/common/http';
import { TranslationService } from '../../../core';

/**
 * Turns any thrown value into a short, user-facing **detail** string, translated to the active
 * locale. Callers prepend their own context prefix (e.g. the watchlist error message) — this
 * only produces the cause.
 *
 * Angular's `HttpClient` rejects with an `HttpErrorResponse`, which only *implements* the `Error`
 * interface and does **not** pass `instanceof Error` (issue #15). Handled explicitly here so a
 * failed API call surfaces its real cause instead of collapsing to a generic literal:
 *
 * - `status === 0` → the request never reached the backend (offline / CORS / DNS): a distinct
 *   network-level message, since there is no HTTP status or server body to show.
 * - any other status → `"<status> — <server detail>"`, where the detail is the backend's
 *   `error.detail` (FastAPI convention), a plain-string body, or the HTTP status text.
 * - a non-HTTP `Error` → its `message`.
 * - anything else → a generic translated fallback.
 */
export function httpErrorDetail(error: unknown, i18n: TranslationService): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return i18n.t('errors.network');
    }
    const detail = extractServerDetail(error);
    return detail ? `${error.status} — ${detail}` : `${error.status}`;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return i18n.t('errors.unknown');
}

/** Pulls the most meaningful message out of an HTTP error body, falling back to the status text. */
function extractServerDetail(error: HttpErrorResponse): string | null {
  const body: unknown = error.error;
  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail?: unknown }).detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail.trim();
    }
  }
  return error.statusText?.trim() || null;
}
