import { AssetClass, ImpactDirection } from '../domain';
import { ScenarioEvidenceDto } from './scenario-evidence-dto';

/** Wire shape of `ScenarioAssetClassImpactResponse`, embedded in `ScenarioResultDto`. */
export interface ScenarioAssetClassImpactDto {
  asset_class: AssetClass;
  direction: ImpactDirection;
  confidence: number;
  evidence: ScenarioEvidenceDto[];
}
