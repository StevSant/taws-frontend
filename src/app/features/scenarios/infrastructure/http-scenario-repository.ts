import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../core';
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
  constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  async fetchPresets(): Promise<ScenarioPreset[]> {
    const dtos = await firstValueFrom(
      this.http.get<ScenarioPresetDto[]>(`${this.config.apiBaseUrl}${SCENARIOS_PATH}/presets`),
    );
    return dtos.map(mapScenarioPresetDto);
  }

  async generateScenario(intake: ScenarioIntake): Promise<ScenarioResult> {
    const body: GenerateScenarioRequestDto = {
      ...(intake.presetId ? { preset_id: intake.presetId } : {}),
      ...(intake.freeText ? { free_text: intake.freeText } : {}),
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

  private armPath(scenarioId: string): string {
    return `${SCENARIOS_PATH}/${scenarioId}/arm`;
  }
}
