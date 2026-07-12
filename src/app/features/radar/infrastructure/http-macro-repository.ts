import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfigService, cachedFetch, RequestCacheService } from '../../../core';
import { MacroIndicator, MacroRepository, MacroSeries, MacroState } from '../domain';
import { mapMacroStateDto } from './map-macro-state-dto';
import { MacroStateDto } from './macro-state-dto';
import { mapMacroSeriesDto } from './map-macro-series-dto';
import { MacroSeriesDto } from './macro-series-dto';

const MACRO_PATH = '/api/v1/macro';
const MACRO_SERIES_PATH = '/api/v1/macro/series';

@Injectable()
export class HttpMacroRepository extends MacroRepository {
  private readonly cache = inject(RequestCacheService);

  constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  async fetchMacroState(): Promise<MacroState> {
    return cachedFetch(
      this.cache,
      'macro',
      'state',
      this.config.instrumentsCacheTtlMs,
      async () => {
        const dto = await firstValueFrom(
          this.http.get<MacroStateDto>(`${this.config.apiBaseUrl}${MACRO_PATH}`),
        );
        return mapMacroStateDto(dto);
      },
    );
  }

  async fetchMacroSeries(indicator: MacroIndicator, days?: number): Promise<MacroSeries> {
    let params = new HttpParams();
    if (days) {
      params = params.set('days', days);
    }
    return cachedFetch(
      this.cache,
      'macro-series',
      `${indicator}:${days ?? 'default'}`,
      this.config.instrumentsCacheTtlMs,
      async () => {
        const dto = await firstValueFrom(
          this.http.get<MacroSeriesDto>(
            `${this.config.apiBaseUrl}${MACRO_SERIES_PATH}/${indicator}`,
            { params },
          ),
        );
        return mapMacroSeriesDto(dto);
      },
    );
  }
}
