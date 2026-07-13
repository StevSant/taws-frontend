import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { AppConfigService, cachedFetch, RequestCacheService } from '../../../core';
import {
  NewsBrowsePage,
  NewsBrowseQuery,
  NewsFacets,
  NewsItem,
  NewsPage,
  NewsPageRequest,
  NewsRepository,
  RadarFilters,
} from '../domain';
import { mapNewsItemDto } from './map-news-item-dto';
import { NewsBrowseResponseDto } from './news-browse-response-dto';
import { NewsFacetsDto } from './news-facets-dto';
import { NewsItemDto } from './news-item-dto';
import { NewsListResponseDto } from './news-list-response-dto';

const NEWS_PATH = '/api/v1/news';
const NEWS_BROWSE_PATH = '/api/v1/news/browse';
const NEWS_FACETS_PATH = '/api/v1/news/facets';
const HTTP_NOT_FOUND = 404;

/** Backend may return a bare array or a paginated `{ items }` envelope. */
type NewsWireResponse = NewsListResponseDto | NewsItemDto[];

/** Unwraps items + `has_more`; a bare-array legacy response has no next page. */
function unwrapNewsPage(response: NewsWireResponse): { items: NewsItemDto[]; hasMore: boolean } {
  return Array.isArray(response)
    ? { items: response, hasMore: false }
    : { items: response.items ?? [], hasMore: response.has_more ?? false };
}

function unwrapNewsItems(response: NewsWireResponse): NewsItemDto[] {
  return unwrapNewsPage(response).items;
}

/**
 * Infrastructure adapter for `NewsRepository`. Calls the real
 * `GET /api/v1/news` endpoint via `HttpClient` (picks up the app-wide auth
 * interceptor for free). Backend may serve fixture data when no live news
 * source is configured (`FixtureNewsProvider`, used as the
 * `AggregatingNewsProvider` fallback) — the response shape is identical
 * either way, so no special-casing is needed here.
 */
@Injectable()
export class HttpNewsRepository extends NewsRepository {
  private readonly cache = inject(RequestCacheService);

  constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  async fetchNews(filters: RadarFilters): Promise<NewsItem[]> {
    const cacheKey = JSON.stringify(filters);
    return cachedFetch(this.cache, 'news', cacheKey, this.config.newsCacheTtlMs, async () => {
      const response = await this.requestNews(this.buildNewsParams(filters));
      return unwrapNewsItems(response).map(mapNewsItemDto);
    });
  }

  async fetchNewsPage(filters: RadarFilters, page: NewsPageRequest): Promise<NewsPage> {
    const cacheKey = JSON.stringify({ filters, page });
    return cachedFetch(this.cache, 'news-page', cacheKey, this.config.newsCacheTtlMs, async () => {
      const params = this.buildNewsParams(filters)
        .set('limit', page.limit)
        .set('offset', page.offset);
      const response = await this.requestNews(params);
      const { items, hasMore } = unwrapNewsPage(response);
      return { items: items.map(mapNewsItemDto), hasMore };
    });
  }

  async browseNews(query: NewsBrowseQuery): Promise<NewsBrowsePage> {
    const cacheKey = JSON.stringify(query);
    return cachedFetch(
      this.cache,
      'news-browse',
      cacheKey,
      this.config.newsCacheTtlMs,
      async () => {
        const dto = await firstValueFrom(
          this.http
            .get<NewsBrowseResponseDto>(`${this.config.apiBaseUrl}${NEWS_BROWSE_PATH}`, {
              params: this.buildBrowseParams(query),
            })
            .pipe(timeout(this.config.newsRequestTimeoutMs)),
        );
        return {
          items: (dto.items ?? []).map(mapNewsItemDto),
          total: dto.total ?? 0,
          page: dto.page ?? query.page,
          pageSize: dto.page_size ?? query.pageSize,
        };
      },
    );
  }

  async fetchNewsFacets(): Promise<NewsFacets> {
    return cachedFetch(this.cache, 'news-facets', 'all', this.config.newsCacheTtlMs, async () => {
      const dto = await firstValueFrom(
        this.http
          .get<NewsFacetsDto>(`${this.config.apiBaseUrl}${NEWS_FACETS_PATH}`)
          .pipe(timeout(this.config.newsRequestTimeoutMs)),
      );
      return { sources: dto.sources ?? [], providers: dto.providers ?? [] };
    });
  }

  /** Only set a param when the facet is actually filtered — an empty `source=` would
   * be sent as a real (never-matching) filter rather than "no filter". */
  private buildBrowseParams(query: NewsBrowseQuery): HttpParams {
    let params = new HttpParams()
      .set('since_hours', query.sinceHours)
      .set('sort_by', query.sortBy)
      .set('sort_dir', query.sortDir)
      .set('page', query.page)
      .set('page_size', query.pageSize);
    if (query.symbol) {
      params = params.set('symbol', query.symbol);
    }
    if (query.assetClass) {
      params = params.set('asset_class', query.assetClass);
    }
    if (query.source) {
      params = params.set('source', query.source);
    }
    if (query.provider) {
      params = params.set('provider', query.provider);
    }
    if (query.sentiment) {
      params = params.set('sentiment', query.sentiment);
    }
    if (query.category) {
      params = params.set('category', query.category);
    }
    if (query.analysisStatus) {
      params = params.set('analysis_status', query.analysisStatus);
    }
    if (query.search) {
      params = params.set('q', query.search);
    }
    return params;
  }

  private buildNewsParams(filters: RadarFilters): HttpParams {
    let params = new HttpParams().set('since_hours', filters.sinceHours);
    if (filters.symbol) {
      params = params.set('symbol', filters.symbol);
    }
    if (filters.assetClass) {
      params = params.set('asset_class', filters.assetClass);
    }
    return params;
  }

  private async requestNews(params: HttpParams): Promise<NewsWireResponse> {
    return firstValueFrom(
      this.http
        .get<NewsWireResponse>(`${this.config.apiBaseUrl}${NEWS_PATH}`, { params })
        .pipe(timeout(this.config.newsRequestTimeoutMs)),
    );
  }

  async getNewsById(id: string): Promise<NewsItem | null> {
    return cachedFetch(this.cache, 'news-item', id, this.config.newsCacheTtlMs, async () => {
      try {
        const dto = await firstValueFrom(
          this.http
            .get<NewsItemDto>(`${this.config.apiBaseUrl}${NEWS_PATH}/${encodeURIComponent(id)}`)
            .pipe(timeout(this.config.newsRequestTimeoutMs)),
        );
        return mapNewsItemDto(dto);
      } catch (error: unknown) {
        if (error instanceof HttpErrorResponse && error.status === HTTP_NOT_FOUND) {
          return this.findNewsInRecentFeed(id);
        }
        throw error;
      }
    });
  }

  /** Fallback when the detail endpoint is unavailable — scan the recent feed. */
  private async findNewsInRecentFeed(id: string): Promise<NewsItem | null> {
    const defaultFilters: RadarFilters = { sinceHours: 720, symbol: null, assetClass: null };
    const news = await this.fetchNews(defaultFilters);
    return news.find((item) => item.id === id) ?? null;
  }
}
