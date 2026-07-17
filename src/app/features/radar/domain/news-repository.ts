import { NewsBrowsePage } from './models/news-browse-page.model';
import { NewsBrowseQuery } from './models/news-browse-query.model';
import { NewsDetail } from './models/news-detail.model';
import { NewsFacets } from './models/news-facets.model';
import { NewsItem } from './models/news-item.model';
import { NewsNotificationResult } from './models/news-notification-result.model';
import { NewsPage } from './models/news-page.model';
import { NewsPageRequest } from './models/news-page-request.model';
import { RadarFilters } from './models/radar-filters.model';

/**
 * Domain port for fetching news. An abstract class (not an interface) so it
 * can double as an Angular DI token — bind the concrete adapter via
 * `{ provide: NewsRepository, useClass: HttpNewsRepository }`.
 *
 * Application/presentation code depends on this abstraction only; it never
 * imports the HTTP adapter directly.
 */
export abstract class NewsRepository {
  /** Returns recent news, most-recent first, filtered by `filters`. */
  abstract fetchNews(filters: RadarFilters): Promise<NewsItem[]>;

  /**
   * Returns one page of news (most-recent first) plus the backend's
   * `has_more` flag, for paginated "see all" views. `fetchNews` remains the
   * unpaginated feed used by the radar home timeline.
   */
  abstract fetchNewsPage(filters: RadarFilters, page: NewsPageRequest): Promise<NewsPage>;

  /**
   * Returns one filtered/sorted page of the persisted news archive plus the exact
   * `total` of the full filtered set, for the numbered `/radar/news` page (issue #70).
   *
   * Server-side (`GET /api/v1/news/browse`) this reads the DB rather than the live
   * provider feed — which is precisely why it can report a `total` and sort across the
   * whole corpus, neither of which `fetchNewsPage` can do.
   */
  abstract browseNews(query: NewsBrowseQuery): Promise<NewsBrowsePage>;

  /** Returns the distinct source/provider values for the browse filter dropdowns. */
  abstract fetchNewsFacets(): Promise<NewsFacets>;

  /**
   * Returns one persisted news item by id together with everything the detail page renders
   * around it — affected instruments (price, % change, sentiment, impact) and related news —
   * or `null` when the backend has no such item (HTTP 404). Used by the per-news detail page
   * (issue #38) so it works after a hard refresh, independent of the in-memory feed.
   *
   * The enrichment is part of the payload (issue #57) rather than something the caller
   * assembles: fetching prices per symbol and related news per symbol from the client meant
   * N+2 round trips, and produced nothing at all for articles the backend linked to no
   * instrument — which is most of the RSS feed.
   *
   * `refresh` bypasses the response cache, for the read that follows a mutation (a manual
   * "Analizar ahora" run, whose freshly-created signal cannot be in a cached response).
   */
  abstract getNewsDetail(id: string, options?: { refresh?: boolean }): Promise<NewsDetail | null>;

  /**
   * Force-analyzes ONE news item, bypassing the backend's cost pre-filter — the
   * "Analizar ahora" action (issue #27). Returns the refreshed item, so the caller can
   * render the fresh signal in place without reloading the page.
   *
   * This is deliberately NOT `SignalRepository.generateSignal(symbol)`: that one is
   * per-instrument, re-classifies the whole symbol, and never links the resulting signal
   * back to the article the user is actually looking at.
   *
   * Throws `NewsNotAnalyzableError` (carrying the skip reason) when the item exists but
   * cannot produce a signal — e.g. it has no linked instrument, there aren't enough
   * distinct sources yet, or the output failed the compliance gate.
   */
  abstract analyzeNewsItem(id: string): Promise<NewsItem>;

  /**
   * Assesses one news item with Gemini and sends a Telegram alert only when it meets the
   * configured relevance threshold for the current user.
   */
  abstract notifyNewsItem(id: string): Promise<NewsNotificationResult>;
}
