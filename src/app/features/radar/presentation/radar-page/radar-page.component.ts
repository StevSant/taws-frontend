import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
  ],
  templateUrl: './radar-page.component.html',
  styleUrl: './radar-page.component.scss',
})
export class RadarPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);

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
    return this.store.assetClassSegments().find((segment) => segment.assetClass === selected) ?? null;
  });

  /** Signals shown in the instrument grid: all, or scoped to the active class. */
  readonly visibleSignals = computed(() => {
    const segment = this.activeSegment();
    return segment ? segment.signals : this.store.signals();
  });

  readonly summaryText = computed(() => {
    const kpis = this.store.kpiSummary();
    const hours = this.store.filters().sinceHours;
    const windowLabel = this.recencyLabel(hours);
    return `${this.i18n.t('radar.summary.prefix')} ${kpis.newsDetected} ${this.i18n.t('radar.summary.events')} ${windowLabel}. ${kpis.pendingReview} ${this.i18n.t('radar.summary.pending')}`;
  });

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

  onAnalyzeAll(): void {
    void this.store.generateAllUnclassified();
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
