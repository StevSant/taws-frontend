import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfigService, cachedFetch, RequestCacheService } from '../../../core';
import { EventStudyStats, MarketStats, QuantRepository } from '../domain';
import { EventStudyStatsDto } from './event-study-dto';
import { mapEventStudyDto } from './map-event-study-dto';
import { mapMarketStatsDto } from './map-market-stats-dto';
import { MarketStatsDto } from './market-stats-dto';

const QUANT_PATH = '/api/v1/quant/stats';
const EVENT_STUDY_PATH = '/api/v1/quant/event-study';
const DEFAULT_WINDOW_DAYS = 14;
const DEFAULT_LOOKBACK_DAYS = 365;
const DEFAULT_MOVE_THRESHOLD_PCT = 3;

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

  async fetchEventStudy(
    symbol: string,
    opts?: { lookbackDays?: number; moveThresholdPct?: number },
  ): Promise<EventStudyStats> {
    const normalized = symbol.toUpperCase();
    const lookbackDays = opts?.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
    const moveThresholdPct = opts?.moveThresholdPct ?? DEFAULT_MOVE_THRESHOLD_PCT;
    const cacheKey = `${normalized}:${lookbackDays}:${moveThresholdPct}`;
    return cachedFetch(
      this.cache,
      'quant-event-study',
      cacheKey,
      this.config.signalsCacheTtlMs,
      async () => {
        const params = new HttpParams()
          .set('instrument', normalized)
          .set('lookback_days', lookbackDays)
          .set('move_threshold_pct', moveThresholdPct);
        const dto = await firstValueFrom(
          this.http.get<EventStudyStatsDto>(`${this.config.apiBaseUrl}${EVENT_STUDY_PATH}`, {
            params,
          }),
        );
        return mapEventStudyDto(dto);
      },
    );
  }
}
