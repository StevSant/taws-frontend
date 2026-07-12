import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AppConfigService,
  cachedFetch,
  RequestCacheService,
  TranslationService,
} from '../../../core';
import {
  ScenarioIntake,
  ScenarioMonitor,
  ScenarioPreset,
  ScenarioRepository,
  ScenarioResult,
} from '../domain';
import { GenerateScenarioRequestDto } from './generate-scenario-request-dto';
import { mapScenarioMonitorDto } from './map-scenario-monitor-dto';
import { mapScenarioPresetDto } from './map-scenario-preset-dto';
import { mapScenarioResultDto } from './map-scenario-result-dto';
import { ScenarioMonitorDto } from './scenario-monitor-dto';
import { ScenarioPresetDto } from './scenario-preset-dto';
import { ScenarioResultDto } from './scenario-result-dto';

const SCENARIOS_PATH = '/api/v1/scenarios';
const HTTP_NOT_FOUND = 404;

/**
 * Infrastructure adapter for `ScenarioRepository`. Calls the real
 * `GET /api/v1/scenarios/presets` and `POST /api/v1/scenarios/generate`
 * endpoints (unauthenticated — a scenario run is shared/global research)
 * plus `POST`/`DELETE /api/v1/scenarios/{id}/arm` (authenticated — the
 * app-wide `authInterceptor` attaches the bearer token when a session
 * exists) via `HttpClient`.
 */
@Injectable()
export class HttpScenarioRepository extends ScenarioRepository {
  private readonly cache = inject(RequestCacheService);

  constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfigService,
    private readonly translation: TranslationService,
  ) {
    super();
  }

  async fetchPresets(): Promise<ScenarioPreset[]> {
    return cachedFetch(
      this.cache,
      'scenario-presets',
      'all',
      this.config.scenarioPresetsCacheTtlMs,
      async () => {
        const dtos = await firstValueFrom(
          this.http.get<ScenarioPresetDto[]>(`${this.config.apiBaseUrl}${SCENARIOS_PATH}/presets`),
        );
        return dtos.map(mapScenarioPresetDto);
      },
    );
  }

  async generateScenario(intake: ScenarioIntake): Promise<ScenarioResult> {
    const body: GenerateScenarioRequestDto = {
      ...(intake.presetId ? { preset_id: intake.presetId } : {}),
      ...(intake.freeText ? { free_text: intake.freeText } : {}),
      locale: this.translation.locale(),
    };
    const dto = await firstValueFrom(
      this.http.post<ScenarioResultDto>(
        `${this.config.apiBaseUrl}${SCENARIOS_PATH}/generate`,
        body,
      ),
    );
    return mapScenarioResultDto(dto);
  }

  async armMonitor(scenarioId: string): Promise<ScenarioMonitor> {
    const dto = await firstValueFrom(
      this.http.post<ScenarioMonitorDto>(
        `${this.config.apiBaseUrl}${this.armPath(scenarioId)}`,
        {},
      ),
    );
    return mapScenarioMonitorDto(dto);
  }

  async disarmMonitor(scenarioId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.config.apiBaseUrl}${this.armPath(scenarioId)}`),
    );
  }

  async listRecentScenarios(limit = 12): Promise<ScenarioResult[]> {
    const params = new HttpParams().set('limit', String(limit));
    const dtos = await firstValueFrom(
      this.http.get<ScenarioResultDto[]>(`${this.config.apiBaseUrl}${SCENARIOS_PATH}`, {
        params,
      }),
    );
    return dtos.map(mapScenarioResultDto);
  }

  async getScenario(scenarioId: string): Promise<ScenarioResult | null> {
    try {
      const dto = await firstValueFrom(
        this.http.get<ScenarioResultDto>(
          `${this.config.apiBaseUrl}${SCENARIOS_PATH}/${scenarioId}`,
        ),
      );
      return mapScenarioResultDto(dto);
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === HTTP_NOT_FOUND) {
        return null;
      }
      throw error;
    }
  }

  private armPath(scenarioId: string): string {
    return `${SCENARIOS_PATH}/${scenarioId}/arm`;
  }
}
