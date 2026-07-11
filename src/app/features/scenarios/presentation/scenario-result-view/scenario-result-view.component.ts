import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BriefingActionStatus } from '../../application';
import {
  AssetClass,
  ImpactDirection,
  ScenarioHorizon,
  ScenarioMagnitude,
  ScenarioMonitor,
  ScenarioMonitorStatus,
  ScenarioResult,
} from '../../domain';
import { TranslationKey, TranslationService } from '../../../../core';
import { ConfidenceGaugeComponent } from '../../../../shared';
import { CausalChainViewComponent } from '../causal-chain-view/causal-chain-view.component';
import { EvidencePanelComponent } from '../evidence-panel/evidence-panel.component';
import { ImpactHeatmapComponent } from '../impact-heatmap/impact-heatmap.component';

const IMPACT_DIRECTION_LABELS: Record<ImpactDirection, TranslationKey> = {
  positive: 'scenarios.result.impact.direction.positive',
  negative: 'scenarios.result.impact.direction.negative',
  neutral: 'scenarios.result.impact.direction.neutral',
  uncertain: 'scenarios.result.impact.direction.uncertain',
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

const MONITOR_STATUS_LABELS: Record<ScenarioMonitorStatus, TranslationKey> = {
  armed: 'scenarios.result.monitor.status.armed',
  matched: 'scenarios.result.monitor.status.matched',
  expired: 'scenarios.result.monitor.status.expired',
};

/**
 * Full `ScenarioResult` view (issue #20, upgrading #13's basic scope):
 * title/narrative, a per-asset-class impact heatmap (`app-impact-heatmap`),
 * per-impact evidence grouped by type (`app-evidence-panel`), the embedded
 * consequence chain as an interactive flow diagram (`app-causal-chain-view`
 * — replaces #13's plain node/edge list), recommended actions, disclaimer,
 * "add to briefing", and "arm monitor" (issue #18/#34) actions. Purely
 * presentational; the three new subcomponents own their own
 * rendering/interaction logic, and auth/monitor state is passed in via
 * inputs rather than read from a store directly.
 */
@Component({
  selector: 'app-scenario-result-view',
  standalone: true,
  imports: [
    RouterLink,
    ImpactHeatmapComponent,
    EvidencePanelComponent,
    CausalChainViewComponent,
    ConfidenceGaugeComponent,
  ],
  templateUrl: './scenario-result-view.component.html',
  styleUrl: './scenario-result-view.component.scss',
})
export class ScenarioResultViewComponent {
  @Input({ required: true }) result!: ScenarioResult;
  @Input() briefingActionStatus: BriefingActionStatus = 'idle';
  @Input() isAuthenticated = false;
  @Input() monitor: ScenarioMonitor | null = null;
  @Input() isArmingMonitor = false;
  @Input() monitorError: string | null = null;
  @Output() addToBriefing = new EventEmitter<void>();
  @Output() armMonitor = new EventEmitter<void>();
  @Output() disarmMonitor = new EventEmitter<void>();

  constructor(readonly i18n: TranslationService) {}

  impactDirectionLabel(direction: ImpactDirection): string {
    return this.i18n.t(IMPACT_DIRECTION_LABELS[direction]);
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

  monitorStatusLabel(status: ScenarioMonitorStatus): string {
    return this.i18n.t(MONITOR_STATUS_LABELS[status]);
  }

  onAddToBriefing(): void {
    this.addToBriefing.emit();
  }

  onArmMonitor(): void {
    this.armMonitor.emit();
  }

  onDisarmMonitor(): void {
    this.disarmMonitor.emit();
  }
}
