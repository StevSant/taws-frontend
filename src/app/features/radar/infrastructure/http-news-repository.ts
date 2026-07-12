import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { AppConfigService, cachedFetch, RequestCacheService } from '../../../core';
import { NewsItem, NewsRepository, RadarFilters } from '../domain';
import { mapNewsItemDto } from './map-news-item-dto';
import { NewsItemDto } from './news-item-dto';
import { NewsListResponseDto } from './news-list-response-dto';

const NEWS_PATH = '/api/v1/news';
const NEWS_REQUEST_TIMEOUT_MS = 8_000;
const HTTP_NOT_FOUND = 404;

/** Backend may return a bare array or a paginated `{ items }` envelope. */
type NewsWireResponse = NewsListResponseDto | NewsItemDto[];

function unwrapNewsItems(response: NewsWireResponse): NewsItemDto[] {
  return Array.isArray(response) ? response : (response.items ?? []);
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
      let params = new HttpParams().set('since_hours', filters.sinceHours);
      if (filters.symbol) {
        params = params.set('symbol', filters.symbol);
      }
      if (filters.assetClass) {
        params = params.set('asset_class', filters.assetClass);
      }

      const response = await firstValueFrom(
        this.http
          .get<NewsWireResponse>(`${this.config.apiBaseUrl}${NEWS_PATH}`, { params })
          .pipe(timeout(NEWS_REQUEST_TIMEOUT_MS)),
      );
      return unwrapNewsItems(response).map(mapNewsItemDto);
    });
  }

  async getNewsById(id: string): Promise<NewsItem | null> {
    return cachedFetch(this.cache, 'news-item', id, this.config.newsCacheTtlMs, async () => {
      try {
        const dto = await firstValueFrom(
          this.http
            .get<NewsItemDto>(`${this.config.apiBaseUrl}${NEWS_PATH}/${encodeURIComponent(id)}`)
            .pipe(timeout(NEWS_REQUEST_TIMEOUT_MS)),
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
