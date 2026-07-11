import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../core';
import { ReviewDecision, ReviewState } from '../../briefings/domain';
import { ReviewDecisionRequestDto } from '../../briefings/infrastructure/review-decision-request-dto';
import { ReviewStateDto } from '../../briefings/infrastructure/review-state-dto';
import { mapReviewStateDto } from '../../briefings/infrastructure/map-review-state-dto';
import { SignalReviewRepository } from '../domain/signal-review-repository';

@Injectable()
export class HttpSignalReviewRepository extends SignalReviewRepository {
  constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  async listSignalReviews(signalId: string): Promise<ReviewState[]> {
    const dtos = await firstValueFrom(
      this.http.get<ReviewStateDto[]>(
        `${this.config.apiBaseUrl}${this.signalReviewsPath(signalId)}`,
      ),
    );
    return dtos.map(mapReviewStateDto);
  }

  async submitSignalReview(
    signalId: string,
    decision: ReviewDecision,
    justification: string,
  ): Promise<ReviewState> {
    const body: ReviewDecisionRequestDto = { decision, justification };
    const dto = await firstValueFrom(
      this.http.post<ReviewStateDto>(
        `${this.config.apiBaseUrl}${this.signalReviewsPath(signalId)}`,
        body,
      ),
    );
    return mapReviewStateDto(dto);
  }

  private signalReviewsPath(signalId: string): string {
    return `/api/v1/signals/${signalId}/reviews`;
  }
}
