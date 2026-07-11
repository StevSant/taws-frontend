import { PercentPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BriefingActionStatus } from '../../application';
import {
  AssetClass,
  EvidenceType,
  ImpactDirection,
  ScenarioHorizon,
  ScenarioMagnitude,
  ScenarioResult,
} from '../../domain';
import { TranslationKey, TranslationService } from '../../../../core';

const IMPACT_DIRECTION_LABELS: Record<ImpactDirection, TranslationKey> = {
  positive: 'scenarios.result.impact.direction.positive',
  negative: 'scenarios.result.impact.direction.negative',
  neutral: 'scenarios.result.impact.direction.neutral',
  uncertain: 'scenarios.result.impact.direction.uncertain',
};

const EVIDENCE_TYPE_LABELS: Record<EvidenceType, TranslationKey> = {
  actual_data: 'scenarios.result.evidence.type.actual_data',
  historical_analog: 'scenarios.result.evidence.type.historical_analog',
  reasoning: 'scenarios.result.evidence.type.reasoning',
};

const MAGNITUDE_LABELS: Record<ScenarioMagnitude, TranslationKey> = {
  low: 'scenarios.magnitude.low',
  medium: 'scenarios.magnitude.medium',
  high: 'scenarios.magnitude.high',
};

const HORIZON_LABELS: Record<ScenarioHorizon, TranslationKey> = {
  immediate: 'scenarios.horizon.immediate',
  short_term: 'scenarios.horizon.short_term',
  medium_term: 'scenarios.horizon.medium_term',
  long_term: 'scenarios.horizon.long_term',
};

const ASSET_CLASS_LABELS: Record<AssetClass, TranslationKey> = {
  stock: 'scenarios.assetClass.stock',
  crypto: 'scenarios.assetClass.crypto',
  credit: 'scenarios.assetClass.credit',
  commodity: 'scenarios.assetClass.commodity',
  forex: 'scenarios.assetClass.forex',
};

/**
 * Basic `ScenarioResult` view (T1 scope, issue #13): title/narrative, a
 * per-asset-class impact list with evidence-type tags, the embedded
 * consequence chain rendered as a plain node/edge list (the full visual
 * causal-chain/heatmap is T2 issue #20), recommended actions, disclaimer,
 * and the "add to briefing" action. Purely presentational.
 */
@Component({
  selector: 'app-scenario-result-view',
  standalone: true,
  imports: [PercentPipe],
  templateUrl: './scenario-result-view.component.html',
  styleUrl: './scenario-result-view.component.scss',
})
export class ScenarioResultViewComponent {
  @Input({ required: true }) result!: ScenarioResult;
  @Input() briefingActionStatus: BriefingActionStatus = 'idle';
  @Output() addToBriefing = new EventEmitter<void>();

  constructor(readonly i18n: TranslationService) {}

  impactDirectionLabel(direction: ImpactDirection): string {
    return this.i18n.t(IMPACT_DIRECTION_LABELS[direction]);
  }

  evidenceTypeLabel(evidenceType: EvidenceType): string {
    return this.i18n.t(EVIDENCE_TYPE_LABELS[evidenceType]);
  }

  magnitudeLabel(magnitude: ScenarioMagnitude): string {
    return this.i18n.t(MAGNITUDE_LABELS[magnitude]);
  }

  horizonLabel(horizon: ScenarioHorizon): string {
    return this.i18n.t(HORIZON_LABELS[horizon]);
  }

  assetClassLabel(assetClass: AssetClass): string {
    return this.i18n.t(ASSET_CLASS_LABELS[assetClass]);
  }

  nodeLabel(nodeId: string): string {
    return this.result.consequenceChain.nodes.find((node) => node.id === nodeId)?.label ?? nodeId;
  }

  onAddToBriefing(): void {
    this.addToBriefing.emit();
  }
}
