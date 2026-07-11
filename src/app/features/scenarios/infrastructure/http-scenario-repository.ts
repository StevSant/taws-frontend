import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../core';
import { ScenarioIntake, ScenarioPreset, ScenarioRepository, ScenarioResult } from '../domain';
import { GenerateScenarioRequestDto } from './generate-scenario-request-dto';
import { mapScenarioPresetDto } from './map-scenario-preset-dto';
import { mapScenarioResultDto } from './map-scenario-result-dto';
import { ScenarioPresetDto } from './scenario-preset-dto';
import { ScenarioResultDto } from './scenario-result-dto';

const SCENARIOS_PATH = '/api/v1/scenarios';

/**
 * Infrastructure adapter for `ScenarioRepository`. Calls the real
 * `GET /api/v1/scenarios/presets` and `POST /api/v1/scenarios/generate`
 * endpoints via `HttpClient`. Neither endpoint requires auth on the backend
 * (`scenarios.py` has no `require_current_user` dependency) — a scenario
 * run is shared/global research, not per-user data.
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
}
