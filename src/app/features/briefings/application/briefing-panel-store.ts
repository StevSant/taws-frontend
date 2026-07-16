import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { NotificationsStore } from '../../../core';
import { SignalRepository } from '../../radar/domain';
import { downloadBlob } from '../../../shared';
import {
  Briefing,
  BriefingRepository,
  ReviewDecision,
  ReviewRepository,
  ReviewState,
} from '../domain';
import { WatchlistStore } from './watchlist-store';

/** Progress of the pre-briefing Analyst pipeline run (issue #61). */
export interface SignalPrepProgress {
  current: number;
  total: number;
}

/**
 * Signal-based state + facade for the briefing/review panel. Presentation
 * components read `watchlists`/`briefings`/`reviewHistoryFor(...)`/etc. and
 * call the `selectWatchlist`/`generateBriefing`/`submitReview` intents; they
 * never touch `BriefingRepository`/`ReviewRepository` directly.
 *
 * Watchlists are **not** owned here — they are read straight off `WatchlistStore`, the app-wide
 * source of truth. This store used to keep its own `watchlists`/`items` copy fetched from the same
 * API, which made an edit on `/watchlists` invisible here (and vice versa) until a reload. Reports
 * now only *consumes* a list: pick which one to report on and generate. Creating, renaming,
 * deleting and adding symbols live solely on `/watchlists`.
 */
@Injectable({ providedIn: 'root' })
export class BriefingPanelStore {
  // `inject()` rather than a constructor parameter: the watchlist pass-throughs below are field
  // initializers, and a parameter property is not assigned yet when those run.
  private readonly watchlistStore = inject(WatchlistStore);

  private readonly briefingsSignal = signal<Briefing[]>([]);
  private readonly reviewHistorySignal = signal<Record<string, ReviewState[]>>({});
  private readonly isLoadingBriefingsSignal = signal(false);
  private readonly isGeneratingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly reviewErrorsSignal = signal<Record<string, string | null>>({});
  private readonly submittingBriefingIdsSignal = signal<ReadonlySet<string>>(new Set());
  private readonly exportingBriefingIdSignal = signal<string | null>(null);
  private readonly exportErrorsSignal = signal<Record<string, string | null>>({});
  private readonly signalPrepProgressSignal = signal<SignalPrepProgress | null>(null);
  private sessionReady = false;

  readonly briefings = this.briefingsSignal.asReadonly();
  readonly isLoadingBriefings = this.isLoadingBriefingsSignal.asReadonly();
  readonly isGenerating = this.isGeneratingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly signalPrepProgress = this.signalPrepProgressSignal.asReadonly();

  // --- Watchlist reads, delegated to the app-wide WatchlistStore -------------------------------
  // Deliberately thin pass-throughs rather than a second copy: the selected list here is the same
  // active list the radar strip and /watchlists act on, so a change in any of them is reflected in
  // all of them with no reload and no chance of divergence.
  readonly watchlists = this.watchlistStore.watchlists;
  readonly watchlistItems = this.watchlistStore.items;
  readonly selectedWatchlistId = this.watchlistStore.activeWatchlistId;
  readonly selectedWatchlist = this.watchlistStore.activeWatchlist;
  readonly isLoadingWatchlists = this.watchlistStore.isLoading;
  readonly isLoadingItems = this.watchlistStore.isLoading;
  readonly hasWatchlists = computed(() => this.watchlistStore.watchlists().length > 0);

  readonly isEmpty = computed(
    () =>
      this.selectedWatchlistId() !== null &&
      !this.isLoadingBriefingsSignal() &&
      !this.errorSignal() &&
      this.briefingsSignal().length === 0,
  );

  constructor(
    private readonly briefingRepository: BriefingRepository,
    private readonly reviewRepository: ReviewRepository,
    private readonly notifications: NotificationsStore,
    private readonly signalRepository: SignalRepository,
  ) {}

  /** Loads the user's watchlists (via `WatchlistStore`) and reports for the active one. */
  async init(): Promise<void> {
    if (this.sessionReady && this.hasWatchlists()) {
      void this.watchlistStore.refresh();
      return;
    }

    await this.watchlistStore.ensureLoaded();
    const active = this.selectedWatchlistId();
    if (active) {
      await this.loadBriefingsFor(active);
    }
    this.sessionReady = true;
  }

  async retry(): Promise<void> {
    const active = this.selectedWatchlistId();
    if (active) {
      await this.selectWatchlist(active);
      return;
    }
    await this.watchlistStore.refresh();
  }

  /**
   * Picks which list to report on. Delegates the selection itself to `WatchlistStore` — which the
   * radar strip and `/watchlists` also drive — and owns only the briefing-side reset.
   */
  async selectWatchlist(watchlistId: string | null): Promise<void> {
    this.briefingsSignal.set([]);
    this.reviewHistorySignal.set({});
    this.errorSignal.set(null);
    if (!watchlistId) {
      return;
    }
    await Promise.all([
      this.loadBriefingsFor(watchlistId),
      this.watchlistStore.selectWatchlist(watchlistId),
    ]);
  }

  /**
   * Triggers on-demand briefing generation for the selected watchlist (HU3).
   *
   * Issue #61: before composing, auto-runs the Analyst pipeline for any watchlist symbol
   * that has no signals yet (with visible progress), so the user never has to know about
   * `POST /api/v1/signals/generate` and the resulting briefing is grounded in real signals
   * instead of an empty state. Signal prep is best-effort — a per-symbol failure is
   * swallowed so one unanalyzable instrument doesn't block the whole briefing.
   */
  async generateBriefing(): Promise<void> {
    const watchlistId = this.selectedWatchlistId();
    if (!watchlistId || this.isGeneratingSignal()) {
      return;
    }

    this.isGeneratingSignal.set(true);
    this.errorSignal.set(null);
    try {
      await this.ensureSignalsForWatchlist();
      const briefing = await this.briefingRepository.generateBriefing(watchlistId);
      this.briefingsSignal.update((briefings) => [briefing, ...briefings]);
      await this.loadReviewHistory(briefing.id);
      this.notifications.notify('briefing', 'notifications.briefing.generated');
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
    } finally {
      this.signalPrepProgressSignal.set(null);
      this.isGeneratingSignal.set(false);
    }
  }

  /** Runs the Analyst pipeline for every selected-watchlist symbol missing signals. */
  private async ensureSignalsForWatchlist(): Promise<void> {
    const symbols = this.watchlistItems().map((item) => item.symbol);
    if (symbols.length === 0) {
      return;
    }
    this.signalPrepProgressSignal.set({ current: 0, total: symbols.length });
    for (const [index, symbol] of symbols.entries()) {
      try {
        const existing = await this.signalRepository.fetchSignals(symbol);
        if (existing.length === 0) {
          await this.signalRepository.generateSignal(symbol);
        }
      } catch {
        // Best-effort: a symbol that can't be analyzed (e.g. transient failure) simply
        // won't contribute signals; the briefing still generates and the backend shows a
        // friendly empty section for it rather than a hard error.
      } finally {
        this.signalPrepProgressSignal.set({ current: index + 1, total: symbols.length });
      }
    }
  }

  reviewHistoryFor(briefingId: string): ReviewState[] {
    return this.reviewHistorySignal()[briefingId] ?? [];
  }

  isSubmittingReviewFor(briefingId: string): boolean {
    return this.submittingBriefingIdsSignal().has(briefingId);
  }

  reviewErrorFor(briefingId: string): string | null {
    return this.reviewErrorsSignal()[briefingId] ?? null;
  }

  isExportingFor(briefingId: string): boolean {
    return this.exportingBriefingIdSignal() === briefingId;
  }

  exportErrorFor(briefingId: string): string | null {
    return this.exportErrorsSignal()[briefingId] ?? null;
  }

  /**
   * Exports a briefing as PDF and triggers a browser download (issue #22).
   * The backend endpoint (`GET /api/v1/briefings/{id}/export.pdf`) is being
   * built in parallel — `BriefingRepository.exportBriefingPdf` already maps
   * a 404/network failure to a clear `Error` message, surfaced here via
   * `exportErrorFor(briefingId)` instead of crashing or failing silently.
   */
  async exportBriefing(briefingId: string): Promise<void> {
    if (this.exportingBriefingIdSignal() !== null) {
      return;
    }

    this.exportingBriefingIdSignal.set(briefingId);
    this.setExportError(briefingId, null);
    try {
      const blob = await this.briefingRepository.exportBriefingPdf(briefingId);
      downloadBlob(blob, `briefing-${briefingId}.pdf`);
    } catch (error: unknown) {
      this.setExportError(briefingId, this.toErrorMessage(error));
    } finally {
      this.exportingBriefingIdSignal.set(null);
    }
  }

  /** Submits a review decision (reviewed/escalated/discarded) with its required justification. */
  async submitReview(
    briefingId: string,
    decision: ReviewDecision,
    justification: string,
  ): Promise<void> {
    const trimmed = justification.trim();
    if (!trimmed || this.submittingBriefingIdsSignal().has(briefingId)) {
      return;
    }

    this.addSubmittingBriefingId(briefingId);
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
      this.removeSubmittingBriefingId(briefingId);
    }
  }

  private async loadBriefingsFor(watchlistId: string): Promise<void> {
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

  private setExportError(briefingId: string, message: string | null): void {
    this.exportErrorsSignal.update((errors) => ({ ...errors, [briefingId]: message }));
  }

  private addSubmittingBriefingId(briefingId: string): void {
    this.submittingBriefingIdsSignal.update((ids) => new Set(ids).add(briefingId));
  }

  private removeSubmittingBriefingId(briefingId: string): void {
    this.submittingBriefingIdsSignal.update((ids) => {
      const next = new Set(ids);
      next.delete(briefingId);
      return next;
    });
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return error.error?.detail ?? error.message ?? 'Unknown error while loading briefings';
    }
    return error instanceof Error ? error.message : 'Unknown error while loading briefings';
  }
}
