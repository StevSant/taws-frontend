import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfigService, cachedFetch, RequestCacheService } from '../../../core';
import { MacroRepository, MacroState } from '../domain';
import { mapMacroStateDto } from './map-macro-state-dto';
import { MacroStateDto } from './macro-state-dto';

const MACRO_PATH = '/api/v1/macro';

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
}
