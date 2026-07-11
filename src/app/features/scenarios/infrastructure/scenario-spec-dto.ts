import { AssetClass, ScenarioHorizon, ScenarioMagnitude } from '../domain';

/** Wire shape of `ScenarioSpecResponse`, embedded in `ScenarioResultDto`. */
export interface ScenarioSpecDto {
  entity: string;
  event_type: string;
  magnitude: ScenarioMagnitude;
  horizon: ScenarioHorizon;
  title: string;
  description: string;
  affected_symbols: string[];
  affected_asset_classes: AssetClass[];
  preset_id: string | null;
}
