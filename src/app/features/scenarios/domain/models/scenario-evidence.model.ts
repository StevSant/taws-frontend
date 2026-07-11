import { EvidenceType } from './evidence-type.model';

/**
 * One grounding-policy-tagged citation backing a `ScenarioAssetClassImpact`.
 * Mirrors `ScenarioEvidenceResponse`
 * (`domain/scenario/entities/scenario_evidence.py`).
 *
 * `detail` already starts with the bracketed tag matching `evidenceType`
 * (`"[dato actual] ..."`, `"[análogo histórico] ..."`, `"[razonamiento] ..."`)
 * — render it directly, don't re-derive the tag client-side.
 */
export interface ScenarioEvidence {
  evidenceType: EvidenceType;
  detail: string;
}
