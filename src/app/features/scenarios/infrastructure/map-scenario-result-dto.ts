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
    disclaimer: dto.disclaimer,
    createdAt: dto.created_at,
  };
}
