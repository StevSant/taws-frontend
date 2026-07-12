import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AppConfigService,
  cachedFetch,
  RequestCacheService,
  TranslationService,
} from '../../../core';
import { Signal, SignalRepository } from '../domain';
import { GenerateSignalRequestDto } from './generate-signal-request-dto';
import { mapSignalDto } from './map-signal-dto';
import { SignalDto } from './signal-dto';

const SIGNALS_PATH = '/api/v1/signals';

@Injectable()
export class HttpSignalRepository extends SignalRepository {
  private readonly cache = inject(RequestCacheService);

  constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfigService,
    private readonly translation: TranslationService,
  ) {
    super();
  }

  async fetchSignals(symbol: string): Promise<Signal[]> {
    const normalized = symbol.toUpperCase();
    return cachedFetch(
      this.cache,
      'signals',
      normalized,
      this.config.signalsCacheTtlMs,
      async () => {
        const params = new HttpParams().set('instrument', normalized);
        const dtos = await firstValueFrom(
          this.http.get<SignalDto[]>(`${this.config.apiBaseUrl}${SIGNALS_PATH}`, { params }),
        );
        return dtos.map(mapSignalDto);
      },
    );
  }

  async generateSignal(symbol: string): Promise<Signal> {
    const body: GenerateSignalRequestDto = {
      instrument_symbol: symbol,
      locale: this.translation.locale(),
    };
    const dto = await firstValueFrom(
      this.http.post<SignalDto>(`${this.config.apiBaseUrl}${SIGNALS_PATH}/generate`, body),
    );
    const signal = mapSignalDto(dto);
    this.cache.set('signals', symbol.toUpperCase(), [signal], this.config.signalsCacheTtlMs);
    return signal;
  }
}
