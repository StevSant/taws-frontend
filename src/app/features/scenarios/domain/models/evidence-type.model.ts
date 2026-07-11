/**
 * The grounding-policy tag on one `ScenarioEvidence` item. Mirrors the
 * backend's `EvidenceType` StrEnum (`domain/scenario/entities/evidence_type.py`).
 *
 * The display label for each value is the literal bracketed tag from the
 * backend's grounding policy — `detail` on `ScenarioEvidence` already starts
 * with that tag (e.g. `"[dato actual] ..."`), so the UI never re-derives the
 * tag text; `evidenceType` is only used to group/style evidence items.
 */
export type EvidenceType = 'actual_data' | 'historical_analog' | 'reasoning';
