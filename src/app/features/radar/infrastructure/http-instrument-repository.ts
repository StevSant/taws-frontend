import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfigService, cachedFetch, RequestCacheService } from '../../../core';
import { AssetClass, Instrument, InstrumentRepository } from '../domain';
import { InstrumentDto } from './instrument-dto';
import { mapInstrumentDto } from './map-instrument-dto';

const INSTRUMENTS_PATH = '/api/v1/instruments';

/**
 * Infrastructure adapter for `InstrumentRepository`. Calls the real
 * `GET /api/v1/instruments` endpoint via `HttpClient`.
 */
@Injectable()
export class HttpInstrumentRepository extends InstrumentRepository {
  private readonly cache = inject(RequestCacheService);

  constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  async fetchInstruments(assetClass?: AssetClass | null): Promise<Instrument[]> {
    const cacheKey = assetClass ?? 'all';
    return cachedFetch(
      this.cache,
      'instruments',
      cacheKey,
      this.config.instrumentsCacheTtlMs,
      async () => {
        let params = new HttpParams();
        if (assetClass) {
          params = params.set('asset_class', assetClass);
        }

        const dtos = await firstValueFrom(
          this.http.get<InstrumentDto[]>(`${this.config.apiBaseUrl}${INSTRUMENTS_PATH}`, {
            params,
          }),
        );
        return (Array.isArray(dtos) ? dtos : []).map(mapInstrumentDto);
      },
    );
  }
}
