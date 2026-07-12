import { Component, OnDestroy, OnInit, computed } from '@angular/core';
import { TranslationService } from '../../../../core';
import { ButtonComponent, EmptyStateComponent, SkeletonCardComponent } from '../../../../shared';
import { RadarStore } from '../../application';
import { RadarFiltersComponent } from '../radar-filters/radar-filters.component';
import { RadarKpiRowComponent } from '../radar-kpi-row/radar-kpi-row.component';
import { RadarMarketPulseComponent } from '../radar-market-pulse/radar-market-pulse.component';
import { RadarMarketScoreComponent } from '../radar-market-score/radar-market-score.component';
import { RadarMacroCardsComponent } from '../radar-macro-cards/radar-macro-cards.component';
import { NewsTimelineComponent } from '../news-timeline/news-timeline.component';
import { InstrumentCardCompactComponent } from '../instrument-card-compact/instrument-card-compact.component';
import { RadarAddInstrumentCardComponent } from '../radar-add-instrument-card/radar-add-instrument-card.component';

@Component({
  selector: 'app-radar-page',
  standalone: true,
  imports: [
    RadarFiltersComponent,
    RadarKpiRowComponent,
    RadarMarketPulseComponent,
    RadarMarketScoreComponent,
    RadarMacroCardsComponent,
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
  readonly summaryText = computed(() => {
    const kpis = this.store.kpiSummary();
    const hours = this.store.filters().sinceHours;
    const windowLabel = this.recencyLabel(hours);
    return `${this.i18n.t('radar.summary.prefix')} ${kpis.newsDetected} ${this.i18n.t('radar.summary.events')} ${windowLabel}. ${kpis.pendingReview} ${this.i18n.t('radar.summary.pending')}`;
  });

  constructor(
    readonly store: RadarStore,
    readonly i18n: TranslationService,
  ) {}

  ngOnInit(): void {
    void this.store.init();
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
}
