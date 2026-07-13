import { NewsSkipReason } from './models/news-skip-reason.model';

/**
 * A news item exists but cannot produce a signal — the domain-level meaning of the
 * backend's 422 from `POST /api/v1/news/{id}/analyze`.
 *
 * Carries the machine-readable `skipReason` so the store can render *why* the manual
 * "Analizar ahora" run produced nothing (no linked instrument, not enough distinct
 * sources, compliance-blocked) instead of an opaque failure. Thrown by the HTTP adapter,
 * so the transport-level `HttpErrorResponse` never leaks past `infrastructure/`.
 */
export class NewsNotAnalyzableError extends Error {
  constructor(readonly skipReason: NewsSkipReason | null) {
    super('The news item could not be analyzed');
    this.name = 'NewsNotAnalyzableError';
  }
}
