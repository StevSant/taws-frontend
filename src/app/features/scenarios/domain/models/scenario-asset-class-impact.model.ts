import { AssetClass } from './asset-class.model';
import { ImpactDirection } from './impact-direction.model';
import { ScenarioEvidence } from './scenario-evidence.model';

/**
 * One entry in a `ScenarioResult.impactMap`: how one asset class is likely
 * affected by the scenario, with its cited evidence. Mirrors
 * `ScenarioAssetClassImpactResponse`
 * (`domain/scenario/entities/scenario_asset_class_impact.py`).
 */
export interface ScenarioAssetClassImpact {
  assetClass: AssetClass;
  direction: ImpactDirection;
  confidence: number;
  evidence: ScenarioEvidence[];
}
