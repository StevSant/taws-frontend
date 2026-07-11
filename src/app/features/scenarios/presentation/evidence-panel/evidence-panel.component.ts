import { Component, Input } from '@angular/core';
import { groupScenarioEvidenceByType, ScenarioEvidenceGroup } from '../../application';
import { EvidenceType, ScenarioEvidence } from '../../domain';
import { TranslationKey, TranslationService } from '../../../../core';

const EVIDENCE_TYPE_LABELS: Record<EvidenceType, TranslationKey> = {
  actual_data: 'scenarios.result.evidence.type.actual_data',
  historical_analog: 'scenarios.result.evidence.type.historical_analog',
  reasoning: 'scenarios.result.evidence.type.reasoning',
};

/**
 * One asset-class impact's evidence, grouped by `evidenceType` into labeled
 * subsections (issue #20 — Evidence panel polish; upgrades #13's flat
 * evidence list). `detail` already carries its bracketed grounding-policy
 * tag (`"[dato actual] ..."`) — rendered verbatim, never re-derived.
 */
@Component({
  selector: 'app-evidence-panel',
  standalone: true,
  templateUrl: './evidence-panel.component.html',
  styleUrl: './evidence-panel.component.scss',
})
export class EvidencePanelComponent {
  @Input({ required: true }) evidence: ScenarioEvidence[] = [];

  constructor(readonly i18n: TranslationService) {}

  get groups(): ScenarioEvidenceGroup[] {
    return groupScenarioEvidenceByType(this.evidence);
  }

  evidenceTypeLabel(evidenceType: EvidenceType): string {
    return this.i18n.t(EVIDENCE_TYPE_LABELS[evidenceType]);
  }
}
