/** Extracts the human-readable FastAPI `detail` from a failed HTTP response body. */
export function extractNewsNotificationErrorDetail(body: unknown): string | null {
  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail?: unknown }).detail;
    return typeof detail === 'string' && detail.trim() ? detail.trim() : null;
  }
  return null;
}
