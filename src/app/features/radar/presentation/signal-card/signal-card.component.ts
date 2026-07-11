import { DatePipe, PercentPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ImpactClass, RadarSignal } from '../../domain';
import { TranslationKey, TranslationService } from '../../../../core';

const IMPACT_CLASS_LABELS: Record<ImpactClass, TranslationKey> = {
  positive: 'radar.card.impact.positive',
  negative: 'radar.card.impact.negative',
  neutral: 'radar.card.impact.neutral',
  uncertain: 'radar.card.impact.uncertain',
};

/**
 * One radar signal card: instrument header, impact/confidence/price-delta
 * metrics (rendered as "unclassified"/"n/a" when the live API hasn't
 * populated them yet — see `RadarSignal`), the linked news evidence
 * (source + date per item), and a static compliance disclaimer.
 */
@Component({
  selector: 'app-signal-card',
  standalone: true,
  imports: [DatePipe, PercentPipe],
  templateUrl: './signal-card.component.html',
  styleUrl: './signal-card.component.scss',
})
export class SignalCardComponent {
  @Input({ required: true }) signal!: RadarSignal;

  constructor(readonly i18n: TranslationService) {}

  impactClassLabel(impactClass: ImpactClass): string {
    return this.i18n.t(IMPACT_CLASS_LABELS[impactClass]);
  }

  formatPriceDelta(delta: number): string {
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(2)}`;
  }
}
