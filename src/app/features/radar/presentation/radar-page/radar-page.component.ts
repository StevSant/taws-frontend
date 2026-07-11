import { Component, OnInit, computed } from '@angular/core';
import { TranslationService } from '../../../../core';
import {
  ButtonComponent,
  EmptyStateComponent,
  FeaturePageHeaderComponent,
  FeaturePageStat,
  SkeletonCardComponent,
} from '../../../../shared';
import { RadarStore } from '../../application';
import { InstrumentRepository, NewsRepository, SignalRepository, SignalReviewRepository } from '../../domain';
import {
  HttpInstrumentRepository,
  HttpNewsRepository,
  HttpSignalRepository,
  HttpSignalReviewRepository,
} from '../../infrastructure';
import { RadarFiltersComponent } from '../radar-filters/radar-filters.component';
import { SignalCardComponent } from '../signal-card/signal-card.component';

@Component({
  selector: 'app-radar-page',
  standalone: true,
  imports: [
    RadarFiltersComponent,
    SignalCardComponent,
    ButtonComponent,
    FeaturePageHeaderComponent,
    SkeletonCardComponent,
    EmptyStateComponent,
  ],
  providers: [
    RadarStore,
    { provide: NewsRepository, useClass: HttpNewsRepository },
    { provide: InstrumentRepository, useClass: HttpInstrumentRepository },
    { provide: SignalRepository, useClass: HttpSignalRepository },
    { provide: SignalReviewRepository, useClass: HttpSignalReviewRepository },
  ],
  templateUrl: './radar-page.component.html',
  styleUrl: './radar-page.component.scss',
})
export class RadarPageComponent implements OnInit {
  readonly headerStats = computed<FeaturePageStat[]>(() => {
    if (this.store.isLoading()) {
      return [];
    }

    return [
      {
        label: this.i18n.t('radar.stats.signals'),
        value: String(this.store.signals().length),
      },
      {
        label: this.i18n.t('radar.stats.unlinked'),
        value: String(this.store.unlinkedNewsCount()),
      },
    ];
  });

  constructor(
    readonly store: RadarStore,
    readonly i18n: TranslationService,
  ) {}

  ngOnInit(): void {
    void this.store.init();
  }

  onRetry(): void {
    void this.store.retry();
  }
}
