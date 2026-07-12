import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../core';
import { ChartRepository } from '../domain/chart-repository';
import { ChartRequest } from '../domain/chart-request.model';
import { ChartSpec } from '../domain/chart-spec.model';

const CHART_RENDER_PATH = '/api/v1/charts/render';

/** Infrastructure adapter for ChartRepository — calls `POST /api/v1/charts/render`. */
@Injectable()
export class HttpChartRepository extends ChartRepository {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AppConfigService);

  async render(request: ChartRequest): Promise<ChartSpec> {
    return firstValueFrom(
      this.http.post<ChartSpec>(`${this.config.apiBaseUrl}${CHART_RENDER_PATH}`, request),
    );
  }
}
