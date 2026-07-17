import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslationKey, TranslationService } from '../../../../core';
import { ButtonComponent, EmptyStateComponent, SpinnerComponent } from '../../../../shared';
import { PriceDeltaChipComponent } from '../../../../shared/price';
import { WatchlistSummary } from '../../../radar/application';
import { ImpactClass } from '../../../radar/domain';
import { WatchlistDetailStore } from '../../application';
import { WatchlistDetailMemberRowComponent } from '../watchlist-detail-member-row/watchlist-detail-member-row.component';
import { WatchlistOutlookPanelComponent } from '../watchlist-outlook-panel/watchlist-outlook-panel.component';

/** Score verdicts share the radar's wording so the hero reads identically to the strip card. */
type HeroScoreLabel = 'bullish' | 'bearish' | 'neutral';

const SCORE_LABELS: Record<HeroScoreLabel, TranslationKey> = {
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

/** Analyst confidence is stored 0–1; the hero shows whole percent. */
const PERCENT_MULTIPLIER = 100;

interface MixEntry {
  key: ImpactClass | 'unclassified';
  count: number;
  labelKey: TranslationKey;
}

/**
 * Watchlist detail page (`/watchlists/:id`). Read-only analysis dashboard for one list: a hero
 * aggregate (identical maths to the radar strip card), a list-level historical outlook, and every
 * member as a row linking to its asset detail page. Add/remove/rename stay on the manage page,
 * reached via the "Gestionar" button.
 *
 * State is owned by the component-scoped `WatchlistDetailStore` (resolved by id, so a hard refresh
 * works). States mirror `AssetDetailPageComponent`: loading, error + retry, not-found, and an
 * empty-list state. The whole page is auth-gated — watchlists are per-user.
 */
@Component({
  selector: 'app-watchlist-detail-page',
  standalone: true,
  imports: [
    RouterLink,
    ButtonComponent,
    EmptyStateComponent,
    SpinnerComponent,
    PriceDeltaChipComponent,
    WatchlistOutlookPanelComponent,
    WatchlistDetailMemberRowComponent,
  ],
  templateUrl: './watchlist-detail-page.component.html',
  styleUrl: './watchlist-detail-page.component.scss',
  providers: [WatchlistDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchlistDetailPageComponent {
  readonly store = inject(WatchlistDetailStore);
  readonly i18n = inject(TranslationService);
  private readonly route = inject(ActivatedRoute);
  private currentId: string | null = null;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = params.get('id');
      if (id && id !== this.currentId) {
        this.currentId = id;
        void this.store.load(id);
      }
    });
  }

  /** `true` when the Analyst has scored no member — the hero says "sin análisis" instead of a verdict. */
  readonly isUnscored = computed(() => {
    const summary = this.store.summary();
    return summary ? summary.score.classifiedCount === 0 : false;
  });

  readonly scoreLabelKey = computed<TranslationKey>(() => {
    const summary = this.store.summary();
    return summary ? SCORE_LABELS[summary.score.label] : 'radar.score.neutral';
  });

  /** Non-empty impact buckets only — an all-positive list shouldn't render three "0" chips. */
  readonly heroMix = computed<MixEntry[]>(() => {
    const summary = this.store.summary();
    if (!summary) {
      return [];
    }
    return summary.distribution
      .filter((slice) => slice.count > 0)
      .map((slice) => ({ key: slice.key, count: slice.count, labelKey: MIX_LABELS[slice.key] }));
  });

  readonly confidencePct = computed(() => {
    const confidence = this.store.summary()?.averageConfidence;
    return confidence === undefined ? null : Math.round(confidence * PERCENT_MULTIPLIER);
  });

  readonly countLabel = computed(() => {
    const summary = this.store.summary();
    if (!summary) {
      return '';
    }
    const key: TranslationKey =
      summary.instrumentCount === 1
        ? 'radar.watchlists.instrument'
        : 'radar.watchlists.instruments';
    return `${summary.instrumentCount} ${this.i18n.t(key)}`;
  });

  heroName(summary: WatchlistSummary): string {
    return this.store.watchlistName() ?? summary.name;
  }

  onRetry(): void {
    void this.store.retry();
  }
}
