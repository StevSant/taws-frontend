/** Wire shape of `ScenarioPresetResponse` as returned by `GET /api/v1/scenarios/presets`. */
export interface ScenarioPresetDto {
  id: string;
  title_es: string;
  title_en: string;
  description_es: string;
  description_en: string;
  entity: string;
  event_type: string;
  magnitude: string;
  horizon: string;
  affected_symbols: string[];
  affected_asset_classes: string[];
}
