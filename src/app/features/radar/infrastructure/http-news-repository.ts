import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../core';
import { NewsItem, NewsRepository, RadarFilters } from '../domain';
import { mapNewsItemDto } from './map-news-item-dto';
import { NewsItemDto } from './news-item-dto';

const NEWS_PATH = '/api/v1/news';

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
  constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  async fetchNews(filters: RadarFilters): Promise<NewsItem[]> {
    let params = new HttpParams().set('since_hours', filters.sinceHours);
    if (filters.symbol) {
      params = params.set('symbol', filters.symbol);
    }
    if (filters.assetClass) {
      params = params.set('asset_class', filters.assetClass);
    }

    const dtos = await firstValueFrom(
      this.http.get<NewsItemDto[]>(`${this.config.apiBaseUrl}${NEWS_PATH}`, { params }),
    );
    return dtos.map(mapNewsItemDto);
  }
}
