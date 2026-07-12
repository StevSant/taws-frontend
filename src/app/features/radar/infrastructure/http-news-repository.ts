import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { AppConfigService, cachedFetch, RequestCacheService } from '../../../core';
import { NewsItem, NewsPage, NewsPageRequest, NewsRepository, RadarFilters } from '../domain';
import { mapNewsItemDto } from './map-news-item-dto';
import { NewsItemDto } from './news-item-dto';
import { NewsListResponseDto } from './news-list-response-dto';

const NEWS_PATH = '/api/v1/news';
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
