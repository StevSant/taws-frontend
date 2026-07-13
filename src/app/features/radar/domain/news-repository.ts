import { NewsBrowsePage } from './models/news-browse-page.model';
import { NewsBrowseQuery } from './models/news-browse-query.model';
import { NewsFacets } from './models/news-facets.model';
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
   * Returns a single persisted news item by id, or `null` when the backend
   * has no such item (HTTP 404). Used by the per-news detail page (issue #38)
   * so it works after a hard refresh, independent of the in-memory feed.
   */
  abstract getNewsById(id: string): Promise<NewsItem | null>;
}
