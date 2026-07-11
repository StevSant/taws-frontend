import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { ImpactClass, RadarSignal } from '../../domain';
import { TranslationKey, TranslationService } from '../../../../core';
import { ConfidenceGaugeComponent } from '../../../../shared';

const IMPACT_CLASS_LABELS: Record<ImpactClass, TranslationKey> = {
  positive: 'radar.card.impact.positive',
  negative: 'radar.card.impact.negative',
  neutral: 'radar.card.impact.neutral',
  uncertain: 'radar.card.impact.uncertain',
};

/** Confidence is a 0-1 fraction on the wire; the gauge expects a 0-100 value. */
const PERCENT_MULTIPLIER = 100;

/**
 * One radar signal card: instrument header, impact/confidence/price-delta
 * metrics (rendered as "unclassified"/"n/a" when the live API hasn't
 * populated them yet — see `RadarSignal`), the linked news evidence
 * (source + date per item), and a static compliance disclaimer.
 */
@Component({
  selector: 'app-signal-card',
  standalone: true,
  imports: [DatePipe, ConfidenceGaugeComponent],
  templateUrl: './signal-card.component.html',
  styleUrl: './signal-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignalCardComponent {
  @Input({ required: true }) signal!: RadarSignal;

  readonly i18n = inject(TranslationService);

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
}
