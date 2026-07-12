import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, inject, signal } from '@angular/core';
import { TranslationKey, TranslationService } from '../../../../core';
import { InstrumentTickerBadgeComponent, ReturnSparklineComponent } from '../../../../shared';
import { RadarSignal, ImpactClass } from '../../domain';
import { SignalAnalysisComponent } from '../signal-analysis/signal-analysis.component';

const IMPACT_LABELS: Record<ImpactClass, TranslationKey> = {
  positive: 'radar.card.impact.positive',
  negative: 'radar.card.impact.negative',
  neutral: 'radar.card.impact.neutral',
  uncertain: 'radar.card.impact.uncertain',
};

@Component({
  selector: 'app-instrument-card-compact',
  standalone: true,
  imports: [
    DecimalPipe,
    ReturnSparklineComponent,
    InstrumentTickerBadgeComponent,
    SignalAnalysisComponent,
  ],
  templateUrl: './instrument-card-compact.component.html',
  styleUrl: './instrument-card-compact.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstrumentCardCompactComponent {
  @Input({ required: true }) signal!: RadarSignal;

  readonly i18n = inject(TranslationService);
  readonly showAnalysis = signal(false);

  /** A persisted Analyst signal exists for this instrument (analysis to expand). */
  hasSignal(): boolean {
    return !!this.signal.signalId;
  }

  toggleAnalysis(): void {
    this.showAnalysis.update((value) => !value);
  }

  impactLabel(): string {
    if (!this.signal.impactClass) {
      return this.i18n.t('radar.landscape.unclassified');
    }
    return this.i18n.t(IMPACT_LABELS[this.signal.impactClass]);
  }

  confidencePct(): string | null {
    if (this.signal.confidence === undefined) {
      return null;
    }
    return `${Math.round(this.signal.confidence * 100)}%`;
  }

  priceDeltaClass(): string {
    const delta = this.signal.priceDelta ?? 0;
    if (delta > 0) {
      return 'instrument-card-compact__delta--up';
    }
    if (delta < 0) {
      return 'instrument-card-compact__delta--down';
    }
    return '';
  }

  formatDelta(): string {
    if (this.signal.priceDelta === undefined) {
      return '—';
    }
    const sign = this.signal.priceDelta > 0 ? '+' : '';
    return `${sign}${this.signal.priceDelta.toFixed(2)}%`;
  }
}
