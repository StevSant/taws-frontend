import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../core';
import { ReviewDecision, ReviewRepository, ReviewState } from '../domain';
import { mapReviewStateDto } from './map-review-state-dto';
import { ReviewDecisionRequestDto } from './review-decision-request-dto';
import { ReviewStateDto } from './review-state-dto';

/**
 * Infrastructure adapter for `ReviewRepository`. Calls the real
 * `GET/POST /api/v1/briefings/{briefing_id}/reviews` endpoints via
 * `HttpClient` (picks up the app-wide auth interceptor for free). These
 * endpoints are ownership-scoped on the backend (404 on another user's
 * briefing) — deliberately never calls the separate, unowned
 * `/api/v1/signals/{signal_id}/reviews` endpoints (see `ReviewRepository`'s
 * docstring).
 */
@Injectable()
export class HttpReviewRepository extends ReviewRepository {
  constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  async listBriefingReviews(briefingId: string): Promise<ReviewState[]> {
    const dtos = await firstValueFrom(
      this.http.get<ReviewStateDto[]>(
        `${this.config.apiBaseUrl}${this.briefingReviewsPath(briefingId)}`,
      ),
    );
    return dtos.map(mapReviewStateDto);
  }

  async submitBriefingReview(
    briefingId: string,
    decision: ReviewDecision,
    justification: string,
  ): Promise<ReviewState> {
    const body: ReviewDecisionRequestDto = { decision, justification };
    const dto = await firstValueFrom(
      this.http.post<ReviewStateDto>(
        `${this.config.apiBaseUrl}${this.briefingReviewsPath(briefingId)}`,
        body,
      ),
    );
    return mapReviewStateDto(dto);
  }

  private briefingReviewsPath(briefingId: string): string {
    return `/api/v1/briefings/${briefingId}/reviews`;
  }
}
