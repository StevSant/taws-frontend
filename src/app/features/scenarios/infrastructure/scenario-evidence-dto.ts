import { EvidenceType } from '../domain';

/** Wire shape of `ScenarioEvidenceResponse`, embedded in `ScenarioAssetClassImpactDto`. */
export interface ScenarioEvidenceDto {
  evidence_type: EvidenceType;
  detail: string;
}
