import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslationService } from '../../../../core';
import { PriceDeltaChipComponent } from '../../../../shared/price';
import { WatchlistOutlook } from '../../application';

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

  constructor(readonly i18n: TranslationService) {}

  /** `true` when at least one horizon has an aggregate reading. */
  readonly hasData = computed(() => {
    const outlook = this.outlook();
    return outlook.forward7dMedianPct !== undefined || outlook.forward30dMedianPct !== undefined;
  });

  readonly contributingLabel = computed(() =>
    this.i18n
      .t('watchlists.detail.outlook.contributing')
      .replace('{count}', String(this.outlook().contributingCount))
      .replace('{total}', String(this.outlook().memberCount)),
  );
}
