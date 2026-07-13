import { ConsequenceChainDto } from './consequence-chain-dto';
import { ScenarioAssetClassImpactDto } from './scenario-asset-class-impact-dto';
import { ScenarioSpecDto } from './scenario-spec-dto';

export interface ScenarioAgentContributionDto {
  agent_id: 'analyst' | 'quant' | 'macro' | 'sentiment' | 'consequence' | 'advisor';
  status: 'completed' | 'failed';
  thesis?: string;
  confidence?: number;
  key_findings?: string[];
  evidence_refs?: string[];
  risks?: string[];
  recommendation?: string;
  uncertainty?: string;
  failure_reason?: string | null;
}

export interface ScenarioConsensusDto {
  summary?: string;
  conclusion?: string;
  agreements?: string[];
  disagreements?: string[];
  uncertainties?: string[];
  confidence?: number;
}

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
  agent_contributions?: ScenarioAgentContributionDto[];
  consensus?: ScenarioConsensusDto | null;
  disclaimer: string;
  created_at: string;
}
