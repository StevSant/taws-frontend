/**
 * One curated "what-if" preset scenario, for the Scenario Lab preset picker.
 * Mirrors `ScenarioPresetResponse` (`GET /api/v1/scenarios/presets`) —
 * bilingual fields included, so the picker doesn't hardcode the preset list.
 *
 * `magnitude`/`horizon`/`affectedAssetClasses` are kept as plain strings
 * here (not the strict `ScenarioMagnitude`/`ScenarioHorizon`/`AssetClass`
 * unions) because the backend's own `ScenarioPresetResponse` types them as
 * loose `str`/`list[str]` — it maps the raw seed JSON row directly rather
 * than the normalized, validated `ScenarioSpecResponse` shape. Matching that
 * looseness here avoids claiming a type guarantee the backend doesn't make.
 */
export interface ScenarioPreset {
  id: string;
  titleEs: string;
  titleEn: string;
  descriptionEs: string;
  descriptionEn: string;
  entity: string;
  eventType: string;
  magnitude: string;
  horizon: string;
  affectedSymbols: string[];
  affectedAssetClasses: string[];
}
