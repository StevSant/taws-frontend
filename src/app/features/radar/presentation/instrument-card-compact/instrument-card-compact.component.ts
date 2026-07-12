import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslationKey, TranslationService } from '../../../../core';
import { InstrumentTickerBadgeComponent, ReturnSparklineComponent } from '../../../../shared';
import { RadarStore } from '../../application';
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
  readonly store = inject(RadarStore);
  private readonly router = inject(Router);
  readonly showAnalysis = signal(false);

  /** A persisted Analyst signal exists for this instrument (analysis to expand). */
  hasSignal(): boolean {
    return !!this.signal.signalId;
  }

  /** No Analyst classification yet — the card offers an inline "Analizar" action. */
  isUnclassified(): boolean {
    return !this.signal.impactClass;
  }

  isGenerating(): boolean {
    return this.store.isGeneratingFor(this.signal.symbol);
  }

  toggleAnalysis(): void {
    this.showAnalysis.update((value) => !value);
  }

  /** Opens the per-asset detail page (issue #43); ignores clicks on inner controls. */
  onCardActivate(event: Event): void {
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    void this.router.navigate(['/radar', this.signal.symbol]);
  }

  onAnalyze(event: Event): void {
    event.stopPropagation();
    void this.store.generateSignal(this.signal.symbol);
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
