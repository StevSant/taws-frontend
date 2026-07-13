/**
 * Distinguishable causes of a dictation failure. The store surfaces one of
 * these (never a raw provider message) so presentation can map it to a specific,
 * localized hint instead of collapsing every failure into one generic banner.
 *
 * - `permission-denied` — the user blocked microphone access.
 * - `unsupported` — no dictation path can run in this browser.
 * - `server-unavailable` — server STT is unconfigured/unreachable (HTTP 503).
 * - `failed` — anything else (the generic fallback).
 */
export type DictationErrorReason =
  'permission-denied' | 'unsupported' | 'server-unavailable' | 'failed';
