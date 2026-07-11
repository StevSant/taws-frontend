import { ScenarioAssetClassImpact } from '../domain';
import { ScenarioAssetClassImpactDto } from './scenario-asset-class-impact-dto';
import { mapScenarioEvidenceDto } from './map-scenario-evidence-dto';

/**
 * Maps a `ScenarioAssetClassImpactDto` (snake_case wire shape) to the domain
 * `ScenarioAssetClassImpact`.
 */
export function mapScenarioAssetClassImpactDto(
  dto: ScenarioAssetClassImpactDto,
): ScenarioAssetClassImpact {
  return {
    assetClass: dto.asset_class,
    direction: dto.direction,
    confidence: dto.confidence,
    evidence: dto.evidence.map(mapScenarioEvidenceDto),
  };
}
