import { AssetClass, ScenarioDirection, ScenarioHorizon, ScenarioMagnitude } from '../domain';

/** Wire shape of `ScenarioSpecResponse`, embedded in `ScenarioResultDto`. */
export interface ScenarioSpecDto {
  entity: string;
  event_type: string;
  magnitude: ScenarioMagnitude;
  horizon: ScenarioHorizon;
  title: string;
  description: string;
  target_price?: number | null;
  direction?: ScenarioDirection | null;
  timeframe_days?: number | null;
  likelihood_pct?: number | null;
  likelihood_sample_size?: number;
  likelihood_occurrences?: number;
  likelihood_method?: string | null;
  affected_symbols: string[];
  affected_asset_classes: AssetClass[];
  preset_id: string | null;
}
