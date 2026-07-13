import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfigService, cachedFetch, RequestCacheService } from '../../../core';
import {
  AssetClass,
  CoinCandidate,
  Instrument,
  InstrumentRepository,
  RegisterInstrumentResult,
} from '../domain';
import { CoinCandidateDto } from './coin-candidate-dto';
import { InstrumentDto } from './instrument-dto';
import { mapCoinCandidateDto } from './map-coin-candidate-dto';
import { mapInstrumentDto } from './map-instrument-dto';
import { mapRegisterInstrumentResponseDto } from './map-register-instrument-response-dto';
import { RegisterInstrumentRequestDto, RegisterInstrumentResponseDto } from './register-instrument-dto';

const INSTRUMENTS_PATH = '/api/v1/instruments';
const INSTRUMENTS_SEARCH_PATH = '/api/v1/instruments/search';

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

  /** Resolves crypto candidates for a free-text query via `GET /api/v1/instruments/search`. */
  async searchCoins(query: string): Promise<CoinCandidate[]> {
    const params = new HttpParams().set('q', query);
    const dtos = await firstValueFrom(
      this.http.get<CoinCandidateDto[]>(`${this.config.apiBaseUrl}${INSTRUMENTS_SEARCH_PATH}`, {
        params,
      }),
    );
    return (Array.isArray(dtos) ? dtos : []).map(mapCoinCandidateDto);
  }

  /** Registers a resolved candidate as a global instrument via `POST /api/v1/instruments`. */
  async registerInstrument(candidate: CoinCandidate): Promise<RegisterInstrumentResult> {
    const body: RegisterInstrumentRequestDto = {
      coingecko_id: candidate.id,
      symbol: candidate.symbol,
      name: candidate.name,
    };
    const dto = await firstValueFrom(
      this.http.post<RegisterInstrumentResponseDto>(
        `${this.config.apiBaseUrl}${INSTRUMENTS_PATH}`,
        body,
      ),
    );
    this.cache.clearNamespace('instruments');
    return mapRegisterInstrumentResponseDto(dto);
  }
}
