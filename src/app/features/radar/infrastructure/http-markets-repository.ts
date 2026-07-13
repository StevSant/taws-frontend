import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AppConfigService,
  cachedFetch,
  RequestCacheService,
  TranslationService,
} from '../../../core';
import { EnrichedInstrumentQuery, InstrumentPage, MarketsRepository } from '../domain';
import { InstrumentPageDto } from './enriched-instrument-dto';
import { mapInstrumentPageDto } from './map-enriched-instrument-dto';

const ENRICHED_INSTRUMENTS_PATH = '/api/v1/instruments/enriched';

/**
 * Infrastructure adapter for `MarketsRepository`. Calls the enriched listing
 * endpoint `GET /api/v1/instruments/enriched`, which returns each row already
 * enriched (price/change/volatility/sparkline/signal) plus highlight groups —
 * so the explorer never fans out one request per instrument per column.
 *
 * Sends the active UI locale (issue #67): the backend caches an instrument's AI signal per
 * `(symbol, locale)`, so a request that names no locale is served whatever the *server*
 * default is — which is how a Spanish UI ended up showing English signals. The locale is
 * part of `params`, hence part of the client-side cache key too, so switching language
 * doesn't serve the previous language's rows from the local cache either.
 */
@Injectable()
export class HttpMarketsRepository extends MarketsRepository {
  private readonly cache = inject(RequestCacheService);

  constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfigService,
    private readonly translation: TranslationService,
  ) {
    super();
  }

  async fetchEnrichedInstruments(query: EnrichedInstrumentQuery): Promise<InstrumentPage> {
    let params = new HttpParams().set('locale', this.translation.locale());
    if (query.assetClass) {
      params = params.set('asset_class', query.assetClass);
    }
    if (query.search?.trim()) {
      params = params.set('search', query.search.trim());
    }
    if (query.sortBy) {
      params = params.set('sort_by', query.sortBy);
    }
    if (query.sortDir) {
      params = params.set('sort_dir', query.sortDir);
    }
    if (query.page) {
      params = params.set('page', query.page);
    }
    if (query.pageSize) {
      params = params.set('page_size', query.pageSize);
    }

    return cachedFetch(
      this.cache,
      'enriched-instruments',
      params.toString() || 'default',
      this.config.signalsCacheTtlMs,
      async () => {
        const dto = await firstValueFrom(
          this.http.get<InstrumentPageDto>(
            `${this.config.apiBaseUrl}${ENRICHED_INSTRUMENTS_PATH}`,
            { params },
          ),
        );
        return mapInstrumentPageDto(dto);
      },
    );
  }
}
