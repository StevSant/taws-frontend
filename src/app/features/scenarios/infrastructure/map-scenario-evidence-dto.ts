import { ScenarioEvidence } from '../domain';
import { ScenarioEvidenceDto } from './scenario-evidence-dto';

/** Maps a `ScenarioEvidenceDto` (snake_case wire shape) to the domain `ScenarioEvidence`. */
export function mapScenarioEvidenceDto(dto: ScenarioEvidenceDto): ScenarioEvidence {
  return {
    evidenceType: dto.evidence_type,
    detail: dto.detail,
  };
}
