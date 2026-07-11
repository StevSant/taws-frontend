import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  inject,
} from '@angular/core';
import { ImpactClass, RadarSignal } from '../../domain';
import { RadarStore } from '../../application';
import { TranslationKey, TranslationService } from '../../../../core';
import { AuthStore } from '../../../auth/application';
import { ButtonComponent, ConfidenceGaugeComponent } from '../../../../shared';
import {
  ReviewDecisionSubmitted,
  ReviewPanelComponent,
} from '../../../briefings/presentation/review-panel/review-panel.component';

const IMPACT_CLASS_LABELS: Record<ImpactClass, TranslationKey> = {
  positive: 'radar.card.impact.positive',
  negative: 'radar.card.impact.negative',
  neutral: 'radar.card.impact.neutral',
  uncertain: 'radar.card.impact.uncertain',
};

const PERCENT_MULTIPLIER = 100;

@Component({
  selector: 'app-signal-card',
  standalone: true,
  imports: [DatePipe, ConfidenceGaugeComponent, ButtonComponent, ReviewPanelComponent],
  templateUrl: './signal-card.component.html',
  styleUrl: './signal-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignalCardComponent implements OnInit {
  @Input({ required: true }) signal!: RadarSignal;

  readonly store = inject(RadarStore);
  readonly auth = inject(AuthStore);
  readonly i18n = inject(TranslationService);

  ngOnInit(): void {
    if (this.signal.signalId) {
      void this.store.ensureSignalReviews(this.signal.signalId);
    }
  }

  impactClassLabel(impactClass: ImpactClass): string {
    return this.i18n.t(IMPACT_CLASS_LABELS[impactClass]);
  }

  formatPriceDelta(delta: number): string {
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(2)}`;
  }

  confidencePercent(confidence: number): number {
    return Math.round(confidence * PERCENT_MULTIPLIER);
  }

  onGenerate(): void {
    void this.store.generateSignal(this.signal.symbol);
  }

  onSubmitReview(event: ReviewDecisionSubmitted): void {
    if (!this.signal.signalId) {
      return;
    }
    void this.store.submitSignalReview(
      this.signal.signalId,
      event.decision,
      event.justification,
    );
  }
}
