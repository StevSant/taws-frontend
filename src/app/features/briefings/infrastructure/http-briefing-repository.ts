import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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

  /**
   * Calls `GET /api/v1/briefings/{id}/export.pdf` directly (not nested under
   * `/watchlists/{id}/briefings/...` like the other two endpoints — this is
   * the flat path agreed with the backend team for issue #22). Requests a
   * `blob` response type since the endpoint returns a PDF, not JSON.
   */
  async exportBriefingPdf(briefingId: string): Promise<Blob> {
    try {
      return await firstValueFrom(
        this.http.get(`${this.config.apiBaseUrl}${this.exportPath(briefingId)}`, {
          responseType: 'blob',
        }),
      );
    } catch (error: unknown) {
      throw this.toExportError(error);
    }
  }

  private briefingsPath(watchlistId: string): string {
    return `/api/v1/watchlists/${watchlistId}/briefings`;
  }

  private exportPath(briefingId: string): string {
    return `/api/v1/briefings/${briefingId}/export.pdf`;
  }

  /**
   * Maps a failed export call to a clear, user-facing `Error` message.
   * Distinguishes the two failure modes the export button explicitly needs
   * to degrade gracefully for (per issue #22): the endpoint not existing yet
   * (404 — the backend half of this issue may still be in flight) and the
   * backend being unreachable entirely (status 0, a network-level failure).
   */
  private toExportError(error: unknown): Error {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 404) {
        return new Error('Export endpoint not available yet (404) — try again later.');
      }
      if (error.status === 0) {
        return new Error('Could not reach the server — check your connection and try again.');
      }
      return new Error(`Export failed (server returned status ${error.status}).`);
    }
    return new Error('Unknown error while exporting the briefing.');
  }
}
