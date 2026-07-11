import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfigService, cachedFetch, RequestCacheService } from '../../../core';
import { Watchlist, WatchlistItem, WatchlistRepository } from '../domain';
import { mapWatchlistDto } from './map-watchlist-dto';
import { mapWatchlistItemDto } from './map-watchlist-item-dto';
import {
  WatchlistCreateRequestDto,
  WatchlistItemAddRequestDto,
  WatchlistItemDto,
  WatchlistRenameRequestDto,
} from './watchlist-item-dto';
import { WatchlistDto } from './watchlist-dto';

const WATCHLISTS_PATH = '/api/v1/watchlists';

@Injectable()
export class HttpWatchlistRepository extends WatchlistRepository {
  private readonly cache = inject(RequestCacheService);

  constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  async fetchWatchlists(): Promise<Watchlist[]> {
    return cachedFetch(
      this.cache,
      'watchlists',
      'all',
      this.config.watchlistsCacheTtlMs,
      async () => {
        const dtos = await firstValueFrom(
          this.http.get<WatchlistDto[]>(`${this.config.apiBaseUrl}${WATCHLISTS_PATH}`),
        );
        return dtos.map(mapWatchlistDto);
      },
    );
  }

  async createWatchlist(name: string): Promise<Watchlist> {
    const body: WatchlistCreateRequestDto = { name };
    const dto = await firstValueFrom(
      this.http.post<WatchlistDto>(`${this.config.apiBaseUrl}${WATCHLISTS_PATH}`, body),
    );
    this.cache.clearNamespace('watchlists');
    return mapWatchlistDto(dto);
  }

  async renameWatchlist(id: string, name: string): Promise<Watchlist> {
    const body: WatchlistRenameRequestDto = { name };
    const dto = await firstValueFrom(
      this.http.patch<WatchlistDto>(`${this.config.apiBaseUrl}${WATCHLISTS_PATH}/${id}`, body),
    );
    return mapWatchlistDto(dto);
  }

  async deleteWatchlist(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.config.apiBaseUrl}${WATCHLISTS_PATH}/${id}`),
    );
    this.cache.clearNamespace('watchlists');
  }

  async listItems(watchlistId: string): Promise<WatchlistItem[]> {
    const dtos = await firstValueFrom(
      this.http.get<WatchlistItemDto[]>(
        `${this.config.apiBaseUrl}${WATCHLISTS_PATH}/${watchlistId}/items`,
      ),
    );
    return dtos.map(mapWatchlistItemDto);
  }

  async addItem(watchlistId: string, symbol: string): Promise<WatchlistItem> {
    const body: WatchlistItemAddRequestDto = { symbol: symbol.trim().toUpperCase() };
    const dto = await firstValueFrom(
      this.http.post<WatchlistItemDto>(
        `${this.config.apiBaseUrl}${WATCHLISTS_PATH}/${watchlistId}/items`,
        body,
      ),
    );
    return mapWatchlistItemDto(dto);
  }

  async removeItem(watchlistId: string, itemId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(
        `${this.config.apiBaseUrl}${WATCHLISTS_PATH}/${watchlistId}/items/${itemId}`,
      ),
    );
  }
}
