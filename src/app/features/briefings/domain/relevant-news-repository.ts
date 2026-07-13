import { RelevantNews } from './models/relevant-news.model';

/**
 * Domain port for fetching recent news for the briefings home strip. An
 * abstract class (not an interface) so it doubles as an Angular DI token —
 * bind the concrete adapter via
 * `{ provide: RelevantNewsRepository, useClass: HttpRelevantNewsRepository }`.
 *
 * Application/presentation code depends on this abstraction only; it never
 * imports the HTTP adapter directly. Kept briefings-local so the feature does
 * not depend on radar's `NewsRepository`.
 */
export abstract class RelevantNewsRepository {
  /**
   * Returns recent news, most-recent first, capped to `limit`. The strip
   * fetches one unfiltered page and intersects `relatedSymbols` with the
   * selected watchlist's symbols client-side — one request, no per-symbol
   * fan-out.
   */
  abstract fetchRecent(limit: number): Promise<RelevantNews[]>;
}
