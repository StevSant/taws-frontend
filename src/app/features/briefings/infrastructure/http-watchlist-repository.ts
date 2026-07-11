import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../core';
import { Watchlist, WatchlistRepository } from '../domain';
import { mapWatchlistDto } from './map-watchlist-dto';
import { WatchlistDto } from './watchlist-dto';

const WATCHLISTS_PATH = '/api/v1/watchlists';

/**
 * Infrastructure adapter for `WatchlistRepository`. Calls the real
 * `GET /api/v1/watchlists` endpoint via `HttpClient` (picks up the app-wide
 * auth interceptor for free — the endpoint requires a valid JWT).
 */
@Injectable()
export class HttpWatchlistRepository extends WatchlistRepository {
  constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  async fetchWatchlists(): Promise<Watchlist[]> {
    const dtos = await firstValueFrom(
      this.http.get<WatchlistDto[]>(`${this.config.apiBaseUrl}${WATCHLISTS_PATH}`),
    );
    return dtos.map(mapWatchlistDto);
  }
}
