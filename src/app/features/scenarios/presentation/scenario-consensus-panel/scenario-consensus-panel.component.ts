import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslationKey, TranslationService } from '../../../../core';
import { MidasGlyphComponent, MidasGlyphId } from '../../../../shared';
import { ScenarioAgentContribution, ScenarioAgentId, ScenarioConsensus } from '../../domain';
import { midasAgentGlyph } from '../../../../shared/midas-glyph/midas-glyph-selection';
import { deriveScenarioCommitteeView } from './derive-scenario-committee-view';

const AGENT_LABELS: Record<ScenarioAgentId, TranslationKey> = {
  analyst: 'scenarios.result.committee.agent.analyst',
  quant: 'scenarios.result.committee.agent.quant',
  macro: 'scenarios.result.committee.agent.macro',
  sentiment: 'scenarios.result.committee.agent.sentiment',
  consequence: 'scenarios.result.committee.agent.consequence',
  advisor: 'scenarios.result.committee.agent.advisor',
};

@Component({
  selector: 'app-scenario-consensus-panel',
  standalone: true,
  imports: [MidasGlyphComponent],
  templateUrl: './scenario-consensus-panel.component.html',
  styleUrl: './scenario-consensus-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScenarioConsensusPanelComponent {
  readonly contributions = input<readonly ScenarioAgentContribution[]>([]);
  readonly consensus = input<ScenarioConsensus | null>(null);

  constructor(readonly i18n: TranslationService) {}

  protected completedContributions(): readonly ScenarioAgentContribution[] {
    return deriveScenarioCommitteeView(this.contributions()).completed;
  }

  protected failedCount(): number {
    return deriveScenarioCommitteeView(this.contributions()).failedCount;
  }

  protected agentLabel(agentId: ScenarioAgentId): string {
    return this.i18n.t(AGENT_LABELS[agentId]);
  }

  protected glyph(agentId: ScenarioAgentId): MidasGlyphId {
    return midasAgentGlyph(agentId);
  }

  protected confidence(value: number): string {
    return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
  }
}
