import { ConsequenceChainDto } from './consequence-chain-dto';
import { ScenarioAssetClassImpactDto } from './scenario-asset-class-impact-dto';
import { ScenarioSpecDto } from './scenario-spec-dto';

/**
 * Wire shape of `ScenarioResultResponse` as returned by
 * `POST /api/v1/scenarios/generate`, `GET /api/v1/scenarios/{id}`, and
 * `GET /api/v1/scenarios`.
 */
export interface ScenarioResultDto {
  id: string;
  spec: ScenarioSpecDto;
  title: string;
  narrative: string;
  impact_map: ScenarioAssetClassImpactDto[];
  consequence_chain: ConsequenceChainDto;
  recommended_actions: string[];
  disclaimer: string;
  created_at: string;
}
