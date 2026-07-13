import { DatePipe } from '@angular/common';
import { Component, OnInit, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../../core';
import {
  ActivityFeedComponent,
  ActivityFeedItem,
  ButtonComponent,
  EmptyStateComponent,
  FeaturePageHeaderComponent,
  FeaturePageStat,
  GuideNotesTabsComponent,
  SkeletonCardComponent,
} from '../../../../shared';
import { NotesPanelComponent } from '../../../notes/presentation';
import { BriefingPanelStore, RelevantNewsStore } from '../../application';
import { RelevantNewsRepository } from '../../domain';
import { HttpRelevantNewsRepository } from '../../infrastructure';
import { ReviewDecisionSubmitted } from '../review-panel/review-panel.component';
import { BriefingCardComponent } from '../briefing-card/briefing-card.component';
import { WatchlistManagerComponent } from '../watchlist-manager/watchlist-manager.component';
import { GenerationFocusComponent } from '../generation-focus/generation-focus.component';
import { NewsStripComponent } from '../news-strip/news-strip.component';

/** Caps the recent-activity list to the most recent entries. */
const ACTIVITY_FEED_LIMIT = 8;

@Component({
  selector: 'app-briefings-page',
  standalone: true,
  imports: [
    FormsModule,
    ButtonComponent,
    FeaturePageHeaderComponent,
    GuideNotesTabsComponent,
    SkeletonCardComponent,
    EmptyStateComponent,
    ActivityFeedComponent,
    BriefingCardComponent,
    WatchlistManagerComponent,
    NotesPanelComponent,
    GenerationFocusComponent,
    NewsStripComponent,
  ],
  providers: [
    DatePipe,
    // Page-scoped news slice: the store + its port→adapter binding live with the
    // page so the "Noticias relevantes" strip stays self-contained (mirrors how
    // chat-page provides its own repository bindings).
    RelevantNewsStore,
    { provide: RelevantNewsRepository, useClass: HttpRelevantNewsRepository },
  ],
  templateUrl: './briefings-page.component.html',
  styleUrl: './briefings-page.component.scss',
})
export class BriefingsPageComponent implements OnInit {
  readonly guideSteps = computed(() => [
    this.i18n.t('briefings.guide.step1'),
    this.i18n.t('briefings.guide.step2'),
    this.i18n.t('briefings.guide.step3'),
  ]);

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

  /**
   * Recent-activity feed sourced from real store data: one entry per
   * generated briefing plus one entry per submitted review decision (see
   * `BriefingPanelStore.briefings`/`reviewHistoryFor`). There is no separate
   * "activity log" endpoint — this composes the two signals already loaded
   * for the page instead of adding a new backend call.
   */
  readonly recentActivity = computed<ActivityFeedItem[]>(() => {
    const entries: { id: string; title: string; meta: string; timestamp: number }[] = [];

    for (const briefing of this.store.briefings()) {
      entries.push({
        id: `${briefing.id}::generated`,
        title: this.i18n.t('briefings.activity.generated'),
        meta: this.formatActivityDate(briefing.createdAt),
        timestamp: Date.parse(briefing.createdAt),
      });

      for (const review of this.store.reviewHistoryFor(briefing.id)) {
        entries.push({
          id: `${briefing.id}::review::${review.id}`,
          title: this.i18n.t(`briefings.review.decision.${review.decision}`),
          meta: this.formatActivityDate(review.createdAt),
          timestamp: Date.parse(review.createdAt),
        });
      }
    }

    return entries
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, ACTIVITY_FEED_LIMIT)
      .map(({ id, title, meta }) => ({ id, title, meta }));
  });

  constructor(
    readonly store: BriefingPanelStore,
    readonly i18n: TranslationService,
    private readonly datePipe: DatePipe,
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

  /** "Nothing selected" empty-state CTA: jump into the first available watchlist. */
  onSelectFirstWatchlist(): void {
    const first = this.store.watchlists()[0];
    if (first) {
      void this.store.selectWatchlist(first.id);
    }
  }

  /**
   * "No watchlists yet" empty-state CTA: scrolls the watchlist manager's create
   * form into view and focuses its name input so the user can start a list. The
   * manager lives in the left column (`#watchlist-create-name`); there is no
   * standalone create action on this page, so this hands off to that form.
   */
  onStartFirstWatchlist(): void {
    const input = document.getElementById('watchlist-create-name');
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (input as HTMLInputElement | null)?.focus({ preventScroll: true });
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

  /** Scrolls the matching briefing card into view (`id` is `"<briefingId>::..."`). */
  onActivitySelect(id: string): void {
    const briefingId = id.split('::')[0];
    document
      .getElementById(`briefing-card-${briefingId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private formatActivityDate(isoDate: string): string {
    return this.datePipe.transform(isoDate, 'short') ?? isoDate;
  }
}
