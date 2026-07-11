import { Injectable, computed, signal } from '@angular/core';
import {
  Briefing,
  BriefingRepository,
  ReviewDecision,
  ReviewRepository,
  ReviewState,
  Watchlist,
  WatchlistRepository,
} from '../domain';

/**
 * Signal-based state + facade for the briefing/review panel. Presentation
 * components read `watchlists`/`briefings`/`reviewHistoryFor(...)`/etc. and
 * call the `selectWatchlist`/`generateBriefing`/`submitReview` intents; they
 * never touch `WatchlistRepository`/`BriefingRepository`/`ReviewRepository`
 * directly.
 */
@Injectable()
export class BriefingPanelStore {
  private readonly watchlistsSignal = signal<Watchlist[]>([]);
  private readonly selectedWatchlistIdSignal = signal<string | null>(null);
  private readonly briefingsSignal = signal<Briefing[]>([]);
  private readonly reviewHistorySignal = signal<Record<string, ReviewState[]>>({});
  private readonly isLoadingWatchlistsSignal = signal(false);
  private readonly isLoadingBriefingsSignal = signal(false);
  private readonly isGeneratingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly reviewErrorsSignal = signal<Record<string, string | null>>({});
  private readonly submittingBriefingIdSignal = signal<string | null>(null);

  readonly watchlists = this.watchlistsSignal.asReadonly();
  readonly selectedWatchlistId = this.selectedWatchlistIdSignal.asReadonly();
  readonly briefings = this.briefingsSignal.asReadonly();
  readonly isLoadingWatchlists = this.isLoadingWatchlistsSignal.asReadonly();
  readonly isLoadingBriefings = this.isLoadingBriefingsSignal.asReadonly();
  readonly isGenerating = this.isGeneratingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  readonly selectedWatchlist = computed<Watchlist | null>(
    () =>
      this.watchlistsSignal().find(
        (watchlist) => watchlist.id === this.selectedWatchlistIdSignal(),
      ) ?? null,
  );

  readonly hasWatchlists = computed(() => this.watchlistsSignal().length > 0);

  readonly isEmpty = computed(
    () =>
      this.selectedWatchlistIdSignal() !== null &&
      !this.isLoadingBriefingsSignal() &&
      !this.errorSignal() &&
      this.briefingsSignal().length === 0,
  );

  constructor(
    private readonly watchlistRepository: WatchlistRepository,
    private readonly briefingRepository: BriefingRepository,
    private readonly reviewRepository: ReviewRepository,
  ) {}

  /** Loads the user's watchlists and auto-selects the first one, if any. */
  async init(): Promise<void> {
    await this.loadWatchlists();
    const first = this.watchlistsSignal()[0];
    if (first) {
      await this.selectWatchlist(first.id);
    }
  }

  async retry(): Promise<void> {
    if (this.selectedWatchlistIdSignal()) {
      await this.selectWatchlist(this.selectedWatchlistIdSignal());
      return;
    }
    await this.loadWatchlists();
  }

  async selectWatchlist(watchlistId: string | null): Promise<void> {
    this.selectedWatchlistIdSignal.set(watchlistId);
    this.briefingsSignal.set([]);
    this.reviewHistorySignal.set({});
    this.errorSignal.set(null);
    if (!watchlistId) {
      return;
    }
    await this.loadBriefings(watchlistId);
  }

  /** Triggers on-demand briefing generation for the selected watchlist (HU3). */
  async generateBriefing(): Promise<void> {
    const watchlistId = this.selectedWatchlistIdSignal();
    if (!watchlistId || this.isGeneratingSignal()) {
      return;
    }

    this.isGeneratingSignal.set(true);
    this.errorSignal.set(null);
    try {
      const briefing = await this.briefingRepository.generateBriefing(watchlistId);
      this.briefingsSignal.update((briefings) => [briefing, ...briefings]);
      await this.loadReviewHistory(briefing.id);
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
    } finally {
      this.isGeneratingSignal.set(false);
    }
  }

  reviewHistoryFor(briefingId: string): ReviewState[] {
    return this.reviewHistorySignal()[briefingId] ?? [];
  }

  isSubmittingReviewFor(briefingId: string): boolean {
    return this.submittingBriefingIdSignal() === briefingId;
  }

  reviewErrorFor(briefingId: string): string | null {
    return this.reviewErrorsSignal()[briefingId] ?? null;
  }

  /** Submits a review decision (reviewed/escalated/discarded) with its required justification. */
  async submitReview(
    briefingId: string,
    decision: ReviewDecision,
    justification: string,
  ): Promise<void> {
    const trimmed = justification.trim();
    if (!trimmed || this.submittingBriefingIdSignal() !== null) {
      return;
    }

    this.submittingBriefingIdSignal.set(briefingId);
    this.setReviewError(briefingId, null);
    try {
      const reviewState = await this.reviewRepository.submitBriefingReview(
        briefingId,
        decision,
        trimmed,
      );
      this.reviewHistorySignal.update((history) => ({
        ...history,
        [briefingId]: [...(history[briefingId] ?? []), reviewState],
      }));
    } catch (error: unknown) {
      this.setReviewError(briefingId, this.toErrorMessage(error));
    } finally {
      this.submittingBriefingIdSignal.set(null);
    }
  }

  private async loadWatchlists(): Promise<void> {
    this.isLoadingWatchlistsSignal.set(true);
    this.errorSignal.set(null);
    try {
      const watchlists = await this.watchlistRepository.fetchWatchlists();
      this.watchlistsSignal.set(watchlists);
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
      this.watchlistsSignal.set([]);
    } finally {
      this.isLoadingWatchlistsSignal.set(false);
    }
  }

  private async loadBriefings(watchlistId: string): Promise<void> {
    this.isLoadingBriefingsSignal.set(true);
    this.errorSignal.set(null);
    try {
      const briefings = await this.briefingRepository.listBriefings(watchlistId);
      this.briefingsSignal.set(briefings);
      await Promise.all(briefings.map((briefing) => this.loadReviewHistory(briefing.id)));
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
      this.briefingsSignal.set([]);
    } finally {
      this.isLoadingBriefingsSignal.set(false);
    }
  }

  private async loadReviewHistory(briefingId: string): Promise<void> {
    try {
      const history = await this.reviewRepository.listBriefingReviews(briefingId);
      this.reviewHistorySignal.update((current) => ({ ...current, [briefingId]: history }));
    } catch {
      // Audit history is supplementary to the briefing itself — a failure
      // here shouldn't block the briefing list from rendering, so it's
      // swallowed rather than surfaced as a page-level error (mirrors
      // RadarStore.loadInstruments' non-blocking-failure pattern).
      this.reviewHistorySignal.update((current) => ({ ...current, [briefingId]: [] }));
    }
  }

  private setReviewError(briefingId: string, message: string | null): void {
    this.reviewErrorsSignal.update((errors) => ({ ...errors, [briefingId]: message }));
  }

  private toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error while loading briefings';
  }
}
