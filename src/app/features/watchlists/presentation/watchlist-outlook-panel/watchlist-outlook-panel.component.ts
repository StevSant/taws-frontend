import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslationKey, TranslationService } from '../../../../core';
import { PriceDeltaChipComponent } from '../../../../shared/price';
import { OutlookHorizon, WatchlistOutlook } from '../../application';

/** List-level outlook label for the selected forward horizon. */
const OUTLOOK_LABELS: Record<OutlookHorizon, TranslationKey> = {
  '24h': 'watchlists.detail.outlook.forward24h',
  '7d': 'watchlists.detail.outlook.forward7d',
  '30d': 'watchlists.detail.outlook.forward30d',
};

/**
 * List-level historical outlook panel. Surfaces the equal-weight typical 7d / 30d forward move
 * across the list's members as `app-price-delta-chip`, how many members contributed, and an
 * explicit base-rate + not-advice disclaimer. Renders an "insufficient history" state when no
 * member carries a forward base rate.
 */
@Component({
  selector: 'app-watchlist-outlook-panel',
  standalone: true,
  imports: [PriceDeltaChipComponent],
  templateUrl: './watchlist-outlook-panel.component.html',
  styleUrl: './watchlist-outlook-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchlistOutlookPanelComponent {
  readonly outlook = input.required<WatchlistOutlook>();
  /** Which forward horizon the panel shows; defaults to today's `'7d'`. */
  readonly horizon = input<OutlookHorizon>('7d');

  constructor(readonly i18n: TranslationService) {}

  readonly horizonLabelKey = computed<TranslationKey>(() => OUTLOOK_LABELS[this.horizon()]);

  /** The list-level forward median for the selected horizon; '24h' reads `forward1dMedianPct`. */
  readonly value = computed<number | undefined>(() => {
    const outlook = this.outlook();
    switch (this.horizon()) {
      case '24h':
        return outlook.forward1dMedianPct;
      case '30d':
        return outlook.forward30dMedianPct;
      case '7d':
      default:
        return outlook.forward7dMedianPct;
    }
  });

  /** `true` when the selected horizon has an aggregate reading. */
  readonly hasData = computed(() => this.value() !== undefined);

  readonly contributingLabel = computed(() =>
    this.i18n
      .t('watchlists.detail.outlook.contributing')
      .replace('{count}', String(this.outlook().contributingCount))
      .replace('{total}', String(this.outlook().memberCount)),
  );
}
