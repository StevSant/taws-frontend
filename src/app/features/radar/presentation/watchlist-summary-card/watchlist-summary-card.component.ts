import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslationKey, TranslationService } from '../../../../core';
import { PriceDeltaChipComponent } from '../../../../shared/price';
import { MarketScore } from '../../application/compute-market-score';
import { WatchlistSummary } from '../../application/watchlist-summary.model';
import { WatchlistSummaryMember } from '../../application/watchlist-summary-member.model';
import { ImpactClass } from '../../domain';
import { instrumentCountLabel } from '../instrument-count-label';

/** Members rendered inline before the rest collapse into a "+N más" chip. */
const MAX_VISIBLE_MEMBERS = 3;

const SCORE_LABELS: Record<MarketScore['label'], TranslationKey> = {
  bullish: 'radar.score.bullish',
  bearish: 'radar.score.bearish',
  neutral: 'radar.score.neutral',
};

const MIX_LABELS: Record<ImpactClass | 'unclassified', TranslationKey> = {
  positive: 'radar.landscape.positive',
  negative: 'radar.landscape.negative',
  neutral: 'radar.landscape.neutral',
  uncertain: 'radar.landscape.uncertain',
  unclassified: 'radar.landscape.unclassified',
};

interface MixEntry {
  key: ImpactClass | 'unclassified';
  count: number;
  labelKey: TranslationKey;
}

/**
 * One watchlist as a card in the radar's "Mis listas" strip. Leads with the Analyst's read on the
 * list, not a price move: Midas scores instruments, and the strip's job is to show which of the
 * user's lists the agent is flagging.
 */
@Component({
  selector: 'app-watchlist-summary-card',
  standalone: true,
  imports: [RouterLink, PriceDeltaChipComponent],
  templateUrl: './watchlist-summary-card.component.html',
  styleUrl: './watchlist-summary-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchlistSummaryCardComponent {
  readonly summary = input.required<WatchlistSummary>();
  readonly active = input(false);
  readonly select = output<string>();

  constructor(readonly i18n: TranslationService) {}

  readonly scoreLabelKey = computed<TranslationKey>(() => SCORE_LABELS[this.summary().score.label]);

  readonly countLabel = computed(() =>
    instrumentCountLabel(this.summary().instrumentCount, this.i18n),
  );

  /**
   * `true` when the Analyst has scored no member. `computeMarketScore` returns a neutral 50 both
   * for a genuinely balanced list and for one it knows nothing about — rendering the latter as
   * "Neutral" would fabricate a verdict, so the card says "sin análisis" instead.
   */
  readonly isUnscored = computed(() => this.summary().score.classifiedCount === 0);

  /** Non-empty buckets only — an all-positive list shouldn't render three "0" chips. */
  readonly mix = computed<MixEntry[]>(() =>
    this.summary()
      .distribution.filter((slice) => slice.count > 0)
      .map((slice) => ({ key: slice.key, count: slice.count, labelKey: MIX_LABELS[slice.key] })),
  );

  /** Analyst confidence is stored 0–1; the card shows whole percent. `null` when absent. */
  readonly confidencePct = computed(() => {
    const confidence = this.summary().averageConfidence;
    return confidence === undefined ? null : Math.round(confidence * 100);
  });

  readonly visibleMembers = computed<WatchlistSummaryMember[]>(() =>
    this.summary().members.slice(0, MAX_VISIBLE_MEMBERS),
  );

  readonly hiddenCount = computed(() =>
    Math.max(0, this.summary().members.length - MAX_VISIBLE_MEMBERS),
  );
}
