import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../core';
import { Briefing, BriefingRepository } from '../domain';
import { BriefingDto } from './briefing-dto';
import { mapBriefingDto } from './map-briefing-dto';

/**
 * Infrastructure adapter for `BriefingRepository`. Calls the real
 * `GET/POST /api/v1/watchlists/{watchlist_id}/briefings` endpoints via
 * `HttpClient` (picks up the app-wide auth interceptor for free — both
 * endpoints require a valid JWT and are scoped to watchlists the
 * authenticated user owns).
 */
@Injectable()
export class HttpBriefingRepository extends BriefingRepository {
  constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  async listBriefings(watchlistId: string): Promise<Briefing[]> {
    const dtos = await firstValueFrom(
      this.http.get<BriefingDto[]>(`${this.config.apiBaseUrl}${this.briefingsPath(watchlistId)}`),
    );
    return dtos.map(mapBriefingDto);
  }

  async generateBriefing(watchlistId: string): Promise<Briefing> {
    const dto = await firstValueFrom(
      this.http.post<BriefingDto>(
        `${this.config.apiBaseUrl}${this.briefingsPath(watchlistId)}`,
        {},
      ),
    );
    return mapBriefingDto(dto);
  }

  private briefingsPath(watchlistId: string): string {
    return `/api/v1/watchlists/${watchlistId}/briefings`;
  }
}
