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

/** Strips a single leading grounding-policy tag (`"[dato actual] "`, `"[razonamiento] "`,
 * etc.) from an evidence detail string. The evidence panel already renders a styled group
 * header per `evidenceType`, so the bracket prefix is redundant noise in the body text
 * (issue #65). Only a leading `[...]` is removed; brackets elsewhere in the text are kept. */
const LEADING_TAG_PATTERN = /^\s*\[[^\]]*\]\s*/;

function stripEvidenceTag(detail: string): string {
  return detail.replace(LEADING_TAG_PATTERN, '');
}

/**
 * Groups one impact's evidence list by `evidenceType`, in the stable order
 * above (see issue #20 — Evidence panel polish). Buckets with no matching
 * items are omitted entirely rather than rendered as an empty subsection.
 * The bracketed grounding-policy tag is dropped from each `detail` (issue #65)
 * in favor of the panel's styled per-type group headers.
 */
export function groupScenarioEvidenceByType(evidence: ScenarioEvidence[]): ScenarioEvidenceGroup[] {
  return EVIDENCE_TYPE_ORDER.map((evidenceType) => ({
    evidenceType,
    items: evidence
      .filter((item) => item.evidenceType === evidenceType)
      .map((item) => ({ ...item, detail: stripEvidenceTag(item.detail) })),
  })).filter((group) => group.items.length > 0);
}
