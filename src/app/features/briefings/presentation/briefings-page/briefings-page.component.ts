import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../../core';
import { ButtonComponent, SpinnerComponent } from '../../../../shared';
import { BriefingPanelStore } from '../../application';
import { BriefingRepository, ReviewRepository, WatchlistRepository } from '../../domain';
import {
  HttpBriefingRepository,
  HttpReviewRepository,
  HttpWatchlistRepository,
} from '../../infrastructure';
import { ReviewDecisionSubmitted } from '../review-panel/review-panel.component';
import { BriefingCardComponent } from '../briefing-card/briefing-card.component';

/**
 * Briefing/review panel page (HU3): pick a watchlist, generate/view its
 * Advisor briefings, and review each one (reviewed/escalated/discarded +
 * required justification) with a visible audit trail. No buy/sell
 * affordance exists anywhere on this page or its children — only
 * alert/task-shaped review actions.
 *
 * `BriefingPanelStore` and the three Http*Repository adapters are provided
 * here so each navigation to this page gets a fresh instance (feature-scoped
 * DI), same pattern as `ChatPageComponent`/`RadarPageComponent`.
 */
@Component({
  selector: 'app-briefings-page',
  standalone: true,
  imports: [FormsModule, ButtonComponent, SpinnerComponent, BriefingCardComponent],
  providers: [
    BriefingPanelStore,
    { provide: WatchlistRepository, useClass: HttpWatchlistRepository },
    { provide: BriefingRepository, useClass: HttpBriefingRepository },
    { provide: ReviewRepository, useClass: HttpReviewRepository },
  ],
  templateUrl: './briefings-page.component.html',
  styleUrl: './briefings-page.component.scss',
})
export class BriefingsPageComponent implements OnInit {
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
