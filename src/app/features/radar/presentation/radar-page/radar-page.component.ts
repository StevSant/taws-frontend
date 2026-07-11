import { Component, OnInit } from '@angular/core';
import { TranslationService } from '../../../../core';
import { ButtonComponent, SpinnerComponent } from '../../../../shared';
import { RadarStore } from '../../application';
import { InstrumentRepository, NewsRepository, SignalRepository } from '../../domain';
import {
  HttpInstrumentRepository,
  HttpNewsRepository,
  HttpSignalRepository,
} from '../../infrastructure';
import { RadarFiltersComponent } from '../radar-filters/radar-filters.component';
import { SignalCardComponent } from '../signal-card/signal-card.component';

/**
 * Radar page: news & signals radar wired to the real `/api/v1/news` and
 * `/api/v1/instruments` endpoints. Groups news by linked instrument into
 * signal cards, with filters (instrument type / asset / recency) backed by
 * real query params, plus loading/error/empty states.
 *
 * `RadarStore`/`NewsRepository`/`InstrumentRepository` are provided here so
 * each navigation to this page gets a fresh instance (feature-scoped DI),
 * same pattern as `ChatPageComponent`.
 */
@Component({
  selector: 'app-radar-page',
  standalone: true,
  imports: [RadarFiltersComponent, SignalCardComponent, SpinnerComponent, ButtonComponent],
  providers: [
    RadarStore,
    { provide: NewsRepository, useClass: HttpNewsRepository },
    { provide: InstrumentRepository, useClass: HttpInstrumentRepository },
    { provide: SignalRepository, useClass: HttpSignalRepository },
  ],
  templateUrl: './radar-page.component.html',
  styleUrl: './radar-page.component.scss',
})
export class RadarPageComponent implements OnInit {
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
