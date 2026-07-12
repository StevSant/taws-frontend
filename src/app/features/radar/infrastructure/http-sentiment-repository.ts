import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfigService, cachedFetch, RequestCacheService } from '../../../core';
import { FearGreedReading, MarketPulse, SentimentRepository } from '../domain';
import { FearGreedReadingDto } from './fear-greed-reading-dto';
import { mapFearGreedReadingDto } from './map-fear-greed-reading-dto';
import { mapMarketPulseDto } from './map-market-pulse-dto';
import { MarketPulseDto } from './market-pulse-dto';

const FEAR_GREED_PATH = '/api/v1/sentiment/fear-greed';
const MARKET_PULSE_PATH = '/api/v1/sentiment/market-pulse';

@Injectable()
export class HttpSentimentRepository extends SentimentRepository {
  private readonly cache = inject(RequestCacheService);

  constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  async fetchMarketPulse(): Promise<MarketPulse> {
    return cachedFetch(
      this.cache,
      'sentiment',
      'market-pulse',
      this.config.instrumentsCacheTtlMs,
      async () => {
        const dto = await firstValueFrom(
          this.http.get<MarketPulseDto>(`${this.config.apiBaseUrl}${MARKET_PULSE_PATH}`),
        );
        return mapMarketPulseDto(dto);
      },
    );
  }

  async fetchFearGreedIndex(): Promise<FearGreedReading> {
    return cachedFetch(
      this.cache,
      'sentiment',
      'fear-greed',
      this.config.instrumentsCacheTtlMs,
      async () => {
        const dto = await firstValueFrom(
          this.http.get<FearGreedReadingDto>(`${this.config.apiBaseUrl}${FEAR_GREED_PATH}`),
        );
        return mapFearGreedReadingDto(dto);
      },
    );
  }
}
