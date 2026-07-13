import { ScenarioResult } from '../domain';
import { ScenarioResultDto } from './scenario-result-dto';
import { mapConsequenceChainDto } from './map-consequence-chain-dto';
import { mapScenarioAssetClassImpactDto } from './map-scenario-asset-class-impact-dto';
import { mapScenarioSpecDto } from './map-scenario-spec-dto';

/** Maps a `ScenarioResultDto` (snake_case wire shape) to the domain `ScenarioResult`. */
export function mapScenarioResultDto(dto: ScenarioResultDto): ScenarioResult {
  return {
    id: dto.id,
    spec: mapScenarioSpecDto(dto.spec),
    title: dto.title,
    narrative: dto.narrative,
    impactMap: dto.impact_map.map(mapScenarioAssetClassImpactDto),
    consequenceChain: mapConsequenceChainDto(dto.consequence_chain),
    recommendedActions: dto.recommended_actions,
    agentContributions: (dto.agent_contributions ?? []).map((item) => ({
      agentId: item.agent_id,
      status: item.status,
      thesis: item.thesis ?? '',
      confidence: item.confidence ?? 0,
      keyFindings: item.key_findings ?? [],
      evidenceRefs: item.evidence_refs ?? [],
      risks: item.risks ?? [],
      recommendation: item.recommendation ?? '',
      uncertainty: item.uncertainty ?? '',
      failureReason: item.failure_reason ?? null,
    })),
    consensus: dto.consensus
      ? {
          summary: dto.consensus.summary ?? '',
          conclusion: dto.consensus.conclusion ?? '',
          agreements: dto.consensus.agreements ?? [],
          disagreements: dto.consensus.disagreements ?? [],
          uncertainties: dto.consensus.uncertainties ?? [],
          confidence: dto.consensus.confidence ?? 0,
        }
      : null,
    disclaimer: dto.disclaimer,
    createdAt: dto.created_at,
  };
}
