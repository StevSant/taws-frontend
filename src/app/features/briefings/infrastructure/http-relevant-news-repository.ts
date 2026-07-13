import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { AppConfigService, cachedFetch, RequestCacheService } from '../../../core';
import { RelevantNews, RelevantNewsRepository } from '../domain';
import { mapRelevantNewsDto } from './map-relevant-news-dto';
import { RelevantNewsDto, RelevantNewsListResponseDto } from './relevant-news-dto';

const NEWS_PATH = '/api/v1/news';

/** Backend may return a bare array or a paginated `{ items }` envelope. */
type RelevantNewsWireResponse = RelevantNewsListResponseDto | RelevantNewsDto[];

/** Unwraps the item list from either the paginated envelope or a bare array. */
function unwrapItems(response: RelevantNewsWireResponse): RelevantNewsDto[] {
  return Array.isArray(response) ? response : (response.items ?? []);
}

/**
 * Infrastructure adapter for `RelevantNewsRepository`. Fetches one unfiltered
 * page of recent news from `GET /api/v1/news` via `HttpClient` (picks up the
 * app-wide auth interceptor for free); the store intersects `relatedSymbols`
 * with the selected watchlist client-side. The base URL, cache TTL and request
 * timeout all come from `AppConfigService` — never hardcoded.
 */
@Injectable()
export class HttpRelevantNewsRepository extends RelevantNewsRepository {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AppConfigService);
  private readonly cache = inject(RequestCacheService);

  async fetchRecent(limit: number): Promise<RelevantNews[]> {
    return cachedFetch(
      this.cache,
      'briefings-relevant-news',
      String(limit),
      this.config.newsCacheTtlMs,
      async () => {
        const params = new HttpParams().set('limit', limit);
        const response = await firstValueFrom(
          this.http
            .get<RelevantNewsWireResponse>(`${this.config.apiBaseUrl}${NEWS_PATH}`, { params })
            .pipe(timeout(this.config.newsRequestTimeoutMs)),
        );
        return unwrapItems(response).map(mapRelevantNewsDto);
      },
    );
  }
}
