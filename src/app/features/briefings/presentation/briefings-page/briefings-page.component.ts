import { Component, OnInit, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../../core';
import {
  ButtonComponent,
  EmptyStateComponent,
  FeaturePageHeaderComponent,
  FeaturePageStat,
  SkeletonCardComponent,
} from '../../../../shared';
import { BriefingPanelStore } from '../../application';
import { ReviewDecisionSubmitted } from '../review-panel/review-panel.component';
import { BriefingCardComponent } from '../briefing-card/briefing-card.component';
import { WatchlistManagerComponent } from '../watchlist-manager/watchlist-manager.component';

@Component({
  selector: 'app-briefings-page',
  standalone: true,
  imports: [
    FormsModule,
    ButtonComponent,
    FeaturePageHeaderComponent,
    SkeletonCardComponent,
    EmptyStateComponent,
    BriefingCardComponent,
    WatchlistManagerComponent,
  ],
  templateUrl: './briefings-page.component.html',
  styleUrl: './briefings-page.component.scss',
})
export class BriefingsPageComponent implements OnInit {
  readonly headerStats = computed<FeaturePageStat[]>(() => {
    if (this.store.isLoadingWatchlists()) {
      return [];
    }

    return [
      {
        label: this.i18n.t('briefings.stats.watchlists'),
        value: String(this.store.watchlists().length),
      },
      {
        label: this.i18n.t('briefings.stats.briefings'),
        value: String(this.store.briefings().length),
      },
    ];
  });

  constructor(
    readonly store: BriefingPanelStore,
    readonly i18n: TranslationService,
  ) {}

  ngOnInit(): void {
    void this.store.init();
  }

  onRetry(): void {
    void this.store.retry();
  }

  onWatchlistChange(watchlistId: string | null): void {
    void this.store.selectWatchlist(watchlistId);
  }

  onGenerate(): void {
    void this.store.generateBriefing();
  }

  onSubmitReview(briefingId: string, event: ReviewDecisionSubmitted): void {
    void this.store.submitReview(briefingId, event.decision, event.justification);
  }

  onExportPdf(briefingId: string): void {
    void this.store.exportBriefing(briefingId);
  }
}
