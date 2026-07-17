import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslationKey, TranslationService } from '../../../../core';
import { ButtonComponent, EmptyStateComponent, SkeletonCardComponent } from '../../../../shared';
import { WatchlistStore } from '../../../briefings/application';
import { RadarStore } from '../../application';
import { AssetClass, ImpactClass } from '../../domain';
import { RadarFiltersComponent } from '../radar-filters/radar-filters.component';
import { RadarKpiRowComponent } from '../radar-kpi-row/radar-kpi-row.component';
import { RadarMacroCardsComponent } from '../radar-macro-cards/radar-macro-cards.component';
import { RadarMacroIndicatorsComponent } from '../radar-macro-indicators/radar-macro-indicators.component';
import { RadarAssetClassTabsComponent } from '../radar-asset-class-tabs/radar-asset-class-tabs.component';
import { RadarCompositionOverviewComponent } from '../radar-composition-overview/radar-composition-overview.component';
import { RadarMarketPulseComponent } from '../radar-market-pulse/radar-market-pulse.component';
import { RadarMarketScoreComponent } from '../radar-market-score/radar-market-score.component';
import { NewsTimelineComponent } from '../news-timeline/news-timeline.component';
import { RadarTopMoversComponent } from '../radar-top-movers/radar-top-movers.component';
import { WatchlistStripComponent } from '../watchlist-strip/watchlist-strip.component';
import { RadarSubNavComponent } from '../radar-sub-nav/radar-sub-nav.component';

const IMPACT_LABEL_KEYS: Record<ImpactClass, TranslationKey> = {
  positive: 'radar.card.impact.positive',
  negative: 'radar.card.impact.negative',
  neutral: 'radar.card.impact.neutral',
  uncertain: 'radar.card.impact.uncertain',
};

@Component({
  selector: 'app-radar-page',
  standalone: true,
  imports: [
    RadarFiltersComponent,
    RadarKpiRowComponent,
    RadarTopMoversComponent,
    RadarMacroCardsComponent,
    RadarMacroIndicatorsComponent,
    RadarAssetClassTabsComponent,
    RadarCompositionOverviewComponent,
    RadarMarketPulseComponent,
    RadarMarketScoreComponent,
    NewsTimelineComponent,
    WatchlistStripComponent,
    RadarSubNavComponent,
    ButtonComponent,
    SkeletonCardComponent,
    EmptyStateComponent,
    RouterLink,
  ],
  templateUrl: './radar-page.component.html',
  styleUrl: './radar-page.component.scss',
})
export class RadarPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /**
   * Client-side dashboard segmentation (issue #41). `null` = the "Todos"
   * composition overview; a class scopes the aggregates, the composition view
   * and the Top-movers columns to that asset class. This is pure view state
   * derived off `RadarStore` signals — it never refetches.
   */
  private readonly selectedClassSignal = signal<AssetClass | null>(null);

  /**
   * The selected class, reset to `null` when it no longer has any signals
   * (e.g. after a filter change drops that class), so the view never points at
   * an empty, tab-less segment.
   */
  readonly selectedClass = computed<AssetClass | null>(() => {
    const selected = this.selectedClassSignal();
    if (selected === null) {
      return null;
    }
    return this.store.assetClassSegments().some((segment) => segment.assetClass === selected)
      ? selected
      : null;
  });

  readonly activeSegment = computed(() => {
    const selected = this.selectedClass();
    if (selected === null) {
      return null;
    }
    return (
      this.store.assetClassSegments().find((segment) => segment.assetClass === selected) ?? null
    );
  });

  readonly summaryText = computed(() => {
    const kpis = this.store.kpiSummary();
    const hours = this.store.filters().sinceHours;
    const windowLabel = this.recencyLabel(hours);
    return `${this.i18n.t('radar.summary.prefix')} ${kpis.newsDetected} ${this.i18n.t('radar.summary.events')} ${windowLabel}. ${kpis.pendingReview} ${this.i18n.t('radar.summary.pending')}`;
  });

  /** Catalizadores: the top of the scope-filtered news timeline (mine/market — see `RadarStore`). */
  readonly recentCatalysts = computed(() => this.store.scopedNewsTimeline().slice(0, 4));
  readonly overviewDistribution = computed(
    () => this.activeSegment()?.landscape.distribution ?? this.store.landscape().distribution,
  );
  readonly overviewMarketScore = computed(
    () => this.activeSegment()?.marketScore ?? this.store.marketScore(),
  );

  constructor(
    readonly store: RadarStore,
    readonly watchlistStore: WatchlistStore,
    readonly i18n: TranslationService,
  ) {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const symbol = params.get('symbol');
      if (symbol) {
        void this.applySymbolFilter(symbol);
      }
    });
  }

  onSelectClass(assetClass: AssetClass | null): void {
    this.selectedClassSignal.set(assetClass);
  }

  /**
   * Composition class rows open the markets explorer pre-filtered by that class (issue #58),
   * rather than only re-scoping the dashboard in-page (that's what the asset-class tabs do).
   */
  navigateToExplorer(assetClass: AssetClass): void {
    void this.router.navigate(['/radar/explore'], { queryParams: { assetClass } });
  }

  ngOnInit(): void {
    void this.store.init();
    const symbol = this.route.snapshot.queryParamMap.get('symbol');
    if (symbol) {
      void this.applySymbolFilter(symbol);
    }
  }

  ngOnDestroy(): void {
    this.store.pausePolling();
  }

  onRetry(): void {
    void this.store.retry();
  }

  /** Retries only the news feed, from the scoped "couldn't load news" state (issue taws#71). */
  onRetryNews(): void {
    void this.store.retryNews();
  }

  impactLabel(impact?: ImpactClass): string {
    return impact
      ? this.i18n.t(IMPACT_LABEL_KEYS[impact])
      : this.i18n.t('radar.landscape.unclassified');
  }

  private recencyLabel(hours: number): string {
    const map: Record<number, string> = {
      24: this.i18n.t('radar.filters.recency.24h'),
      48: this.i18n.t('radar.filters.recency.48h'),
      168: this.i18n.t('radar.filters.recency.168h'),
      720: this.i18n.t('radar.filters.recency.720h'),
    };
    return map[hours] ?? `${hours}h`;
  }

  private async applySymbolFilter(symbol: string): Promise<void> {
    if (this.store.filters().assetClass !== null) {
      await this.store.setAssetClass(null);
    }
    await this.store.setSymbol(symbol);
  }
}
