/**
 * Intake payload for `ScenarioRepository.generateScenario` — either a
 * curated preset id or free-form text, mirroring `GenerateScenarioRequest`
 * (`POST /api/v1/scenarios/generate`'s request body). Never send both;
 * `presetId` takes precedence on the backend if both are somehow set.
 */
export interface ScenarioIntake {
  presetId?: string;
  freeText?: string;
}
