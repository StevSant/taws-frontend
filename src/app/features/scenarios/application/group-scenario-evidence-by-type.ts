import { EvidenceType, ScenarioEvidence } from '../domain';

/** Stable display order for evidence groups — mirrors the backend's
 * grounding-policy priority (actual data first, then historical analogs,
 * then pure reasoning). */
const EVIDENCE_TYPE_ORDER: readonly EvidenceType[] = [
  'actual_data',
  'historical_analog',
  'reasoning',
];

/** One `evidenceType` bucket of a `ScenarioAssetClassImpact.evidence` list. */
export interface ScenarioEvidenceGroup {
  evidenceType: EvidenceType;
  items: ScenarioEvidence[];
}

/**
 * Groups one impact's evidence list by `evidenceType`, in the stable order
 * above (see issue #20 — Evidence panel polish). Buckets with no matching
 * items are omitted entirely rather than rendered as an empty subsection.
 * `item.detail` already carries its bracketed grounding-policy tag
 * (`"[dato actual] ..."`, etc.) — this only groups, it never rewrites text.
 */
export function groupScenarioEvidenceByType(evidence: ScenarioEvidence[]): ScenarioEvidenceGroup[] {
  return EVIDENCE_TYPE_ORDER.map((evidenceType) => ({
    evidenceType,
    items: evidence.filter((item) => item.evidenceType === evidenceType),
  })).filter((group) => group.items.length > 0);
}
