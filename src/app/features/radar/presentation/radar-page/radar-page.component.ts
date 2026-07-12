import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslationService } from '../../../../core';
import { ButtonComponent, EmptyStateComponent, SkeletonCardComponent } from '../../../../shared';
import { RadarStore } from '../../application';
import { AssetClass } from '../../domain';
import { RadarFiltersComponent } from '../radar-filters/radar-filters.component';
import { RadarKpiRowComponent } from '../radar-kpi-row/radar-kpi-row.component';
import { RadarMacroCardsComponent } from '../radar-macro-cards/radar-macro-cards.component';
import { RadarAssetClassTabsComponent } from '../radar-asset-class-tabs/radar-asset-class-tabs.component';
import { RadarCompositionOverviewComponent } from '../radar-composition-overview/radar-composition-overview.component';
import { RadarAssetClassSectionComponent } from '../radar-asset-class-section/radar-asset-class-section.component';
import { NewsTimelineComponent } from '../news-timeline/news-timeline.component';
import { InstrumentCardCompactComponent } from '../instrument-card-compact/instrument-card-compact.component';
import { RadarAddInstrumentCardComponent } from '../radar-add-instrument-card/radar-add-instrument-card.component';

@Component({
  selector: 'app-radar-page',
  standalone: true,
  imports: [
    RadarFiltersComponent,
    RadarKpiRowComponent,
    RadarMacroCardsComponent,
    RadarAssetClassTabsComponent,
    RadarCompositionOverviewComponent,
    RadarAssetClassSectionComponent,
    NewsTimelineComponent,
    InstrumentCardCompactComponent,
    RadarAddInstrumentCardComponent,
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
   * composition overview; a class scopes the aggregates and instrument grid to
   * that asset class. This is pure view state derived off `RadarStore` signals
   * — it never refetches.
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

  /**
   * Instruments shown in the "en seguimiento" section, sorted by urgency:
   * - an active asset-class tab → that segment (explicit drill into the market universe);
   * - otherwise the user's watchlist when it is non-empty (issue #16);
   * - else the default news-driven universe.
   */
  readonly visibleSignals = computed(() => {
    const segment = this.activeSegment();
    const watchlist = this.store.watchlistSignals();
    const signals = segment
      ? segment.signals
      : watchlist.length > 0
        ? watchlist
        : this.store.signals();
    return [...signals].sort((a, b) => this.signalPriority(b) - this.signalPriority(a));
  });

  readonly summaryText = computed(() => {
    const kpis = this.store.kpiSummary();
    const hours = this.store.filters().sinceHours;
    const windowLabel = this.recencyLabel(hours);
    return `${this.i18n.t('radar.summary.prefix')} ${kpis.newsDetected} ${this.i18n.t('radar.summary.events')} ${windowLabel}. ${kpis.pendingReview} ${this.i18n.t('radar.summary.pending')}`;
  });

  readonly headlineInsight = computed(() => this.store.newsTimeline()[0]?.news.title ?? null);

  constructor(
    readonly store: RadarStore,
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

  onAnalyzeAll(): void {
    void this.store.generateAllUnclassified();
  }

  private signalPriority(signal: {
    impactClass?: string;
    confidence?: number;
    news: unknown[];
  }): number {
    const impactWeight: Record<string, number> = {
      negative: 4,
      positive: 3,
      uncertain: 2,
      neutral: 1,
    };
    const impact = signal.impactClass ? (impactWeight[signal.impactClass] ?? 0) : 5;
    const confidence = signal.confidence ?? 0;
    return impact * 100 + confidence * 10 + signal.news.length;
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
