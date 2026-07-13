import { Component, Input } from '@angular/core';
import { TranslationService } from '../../../../core';
import { ScenarioResult } from '../../domain';
import {
  deriveScenarioPipelineTrace,
  ScenarioPipelineTrace,
} from './derive-scenario-pipeline-trace';

@Component({
  selector: 'app-scenario-pipeline-trace-panel',
  standalone: true,
  templateUrl: './scenario-pipeline-trace-panel.component.html',
  styleUrl: './scenario-pipeline-trace-panel.component.scss',
})
export class ScenarioPipelineTracePanelComponent {
  @Input({ required: true }) result!: ScenarioResult;

  constructor(readonly i18n: TranslationService) {}

  get trace(): ScenarioPipelineTrace {
    return deriveScenarioPipelineTrace(this.result);
  }

  formatPercent(value: number | null): string {
    if (value === null) {
      return this.i18n.t('scenarios.result.pipeline.metric.unavailable');
    }

    return `${(value * 100).toFixed(0)}%`;
  }

  formatLikelihood(): string {
    const { likelihoodPct, likelihoodSampleSize } = this.trace;
    if (likelihoodPct === null || likelihoodSampleSize === 0) {
      return this.i18n.t('scenarios.result.pipeline.metric.unavailable');
    }

    if (likelihoodPct === 0) {
      return `<${(100 / likelihoodSampleSize).toFixed(2)}%`;
    }

    return `${likelihoodPct.toFixed(2)}%`;
  }
}
