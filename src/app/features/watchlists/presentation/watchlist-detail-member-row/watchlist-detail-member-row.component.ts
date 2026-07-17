import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslationKey, TranslationService } from '../../../../core';
import { InstrumentTickerBadgeComponent } from '../../../../shared';
import { PriceDeltaChipComponent } from '../../../../shared/price';
import { ImpactClass } from '../../../radar/domain';
import { WatchlistDetailMember } from '../../application';

const IMPACT_LABELS: Record<ImpactClass, TranslationKey> = {
  positive: 'radar.card.impact.positive',
  negative: 'radar.card.impact.negative',
  neutral: 'radar.card.impact.neutral',
  uncertain: 'radar.card.impact.uncertain',
};

/** Analyst confidence is stored 0–1; the row shows whole percent. */
const PERCENT_MULTIPLIER = 100;

/**
 * One watchlist member as a row on the detail page: ticker + name, the Analyst impact badge,
 * confidence, price delta, and — when the instrument has a historical base rate
 * (`outlook.sampleSize > 0`) — a compact outlook line. The whole row links to the asset detail
 * page (`/radar/{symbol}`).
 */
@Component({
  selector: 'app-watchlist-detail-member-row',
  standalone: true,
  imports: [DecimalPipe, RouterLink, InstrumentTickerBadgeComponent, PriceDeltaChipComponent],
  templateUrl: './watchlist-detail-member-row.component.html',
  styleUrl: './watchlist-detail-member-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchlistDetailMemberRowComponent {
  readonly member = input.required<WatchlistDetailMember>();

  constructor(readonly i18n: TranslationService) {}

  /** Whole-percent confidence, or `null` when the Analyst hasn't scored this instrument. */
  readonly confidencePct = computed(() => {
    const confidence = this.member().confidence;
    return confidence === undefined ? null : Math.round(confidence * PERCENT_MULTIPLIER);
  });

  /** A member shows its outlook line only when it has a non-empty historical base rate. */
  readonly hasOutlook = computed(() => {
    const outlook = this.member().outlook;
    return outlook !== undefined && outlook.sampleSize > 0;
  });

  readonly similarMovesLabel = computed(() =>
    this.i18n
      .t('watchlists.detail.member.similarMoves')
      .replace('{count}', String(this.member().outlook?.sampleSize ?? 0)),
  );

  impactLabel(impact: ImpactClass): string {
    return this.i18n.t(IMPACT_LABELS[impact]);
  }
}
