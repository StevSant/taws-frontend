import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../core';
import { Signal, SignalRepository } from '../domain';
import { mapSignalDto } from './map-signal-dto';
import { SignalDto } from './signal-dto';

const SIGNALS_PATH = '/api/v1/signals';

/**
 * Infrastructure adapter for `SignalRepository`. Calls the real
 * `GET /api/v1/signals` endpoint via `HttpClient`.
 */
@Injectable()
export class HttpSignalRepository extends SignalRepository {
  constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  async fetchSignals(symbol: string): Promise<Signal[]> {
    const params = new HttpParams().set('instrument', symbol);
    const dtos = await firstValueFrom(
      this.http.get<SignalDto[]>(`${this.config.apiBaseUrl}${SIGNALS_PATH}`, { params }),
    );
    return dtos.map(mapSignalDto);
  }
}
