import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfigService, cachedFetch, RequestCacheService } from '../../../core';
import { MarketStats, QuantRepository } from '../domain';
import { mapMarketStatsDto } from './map-market-stats-dto';
import { MarketStatsDto } from './market-stats-dto';

const QUANT_PATH = '/api/v1/quant/stats';
const DEFAULT_WINDOW_DAYS = 14;

@Injectable()
export class HttpQuantRepository extends QuantRepository {
  private readonly cache = inject(RequestCacheService);

  constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  async fetchMarketStats(symbol: string, windowDays = DEFAULT_WINDOW_DAYS): Promise<MarketStats> {
    const normalized = symbol.toUpperCase();
    const cacheKey = `${normalized}:${windowDays}`;
    return cachedFetch(
      this.cache,
      'quant-stats',
      cacheKey,
      this.config.signalsCacheTtlMs,
      async () => {
        const params = new HttpParams()
          .set('instrument', normalized)
          .set('window_days', windowDays);
        const dto = await firstValueFrom(
          this.http.get<MarketStatsDto>(`${this.config.apiBaseUrl}${QUANT_PATH}`, { params }),
        );
        return mapMarketStatsDto(dto);
      },
    );
  }
}
