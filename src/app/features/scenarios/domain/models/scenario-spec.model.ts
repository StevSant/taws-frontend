import { AssetClass } from './asset-class.model';
import { ScenarioHorizon } from './scenario-horizon.model';
import { ScenarioMagnitude } from './scenario-magnitude.model';

export type ScenarioDirection = 'up' | 'down' | 'unchanged';

/**
 * The normalized shape both free-form and preset Scenario Lab intake
 * produce, embedded in a `ScenarioResult`. Mirrors `ScenarioSpecResponse`
 * (`domain/scenario/entities/scenario_spec.py`).
 */
export interface ScenarioSpec {
  entity: string;
  eventType: string;
  magnitude: ScenarioMagnitude;
  horizon: ScenarioHorizon;
  title: string;
  description: string;
  targetPrice: number | null;
  direction: ScenarioDirection | null;
  timeframeDays: number | null;
  likelihoodPct: number | null;
  likelihoodSampleSize: number;
  likelihoodOccurrences: number;
  likelihoodMethod: string | null;
  affectedSymbols: string[];
  affectedAssetClasses: AssetClass[];
  presetId: string | null;
}
