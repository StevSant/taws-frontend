import { NewsItem } from './models/news-item.model';
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
   * Returns a single persisted news item by id, or `null` when the backend
   * has no such item (HTTP 404). Used by the per-news detail page (issue #38)
   * so it works after a hard refresh, independent of the in-memory feed.
   */
  abstract getNewsById(id: string): Promise<NewsItem | null>;
}
