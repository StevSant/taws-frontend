import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { NotificationsStore } from '../../../core';
import { Instrument, InstrumentRepository, SignalRepository } from '../../radar/domain';
import { downloadBlob } from '../../../shared';
import {
  Briefing,
  BriefingRepository,
  ReviewDecision,
  ReviewRepository,
  ReviewState,
  Watchlist,
  WatchlistItem,
  WatchlistRepository,
} from '../domain';

/** Reason an "add symbol" attempt was rejected client-side, mapped to i18n by the UI. */
export type AddSymbolError = 'unknown' | 'duplicate';

/** Progress of the pre-briefing Analyst pipeline run (issue #61). */
export interface SignalPrepProgress {
  current: number;
  total: number;
}

/** A watchlist item enriched with its instrument's display name for the preview. */
export interface WatchlistItemView {
  id: string;
  symbol: string;
  name: string;
}

/**
 * Signal-based state + facade for the briefing/review panel. Presentation
 * components read `watchlists`/`briefings`/`reviewHistoryFor(...)`/etc. and
 * call the `selectWatchlist`/`generateBriefing`/`submitReview` intents; they
 * never touch `WatchlistRepository`/`BriefingRepository`/`ReviewRepository`
 * directly.
 */
@Injectable({ providedIn: 'root' })
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
  private readonly submittingBriefingIdsSignal = signal<ReadonlySet<string>>(new Set());
  private readonly exportingBriefingIdSignal = signal<string | null>(null);
  private readonly exportErrorsSignal = signal<Record<string, string | null>>({});
  private readonly watchlistItemsSignal = signal<WatchlistItem[]>([]);
  private readonly isLoadingItemsSignal = signal(false);
  private readonly isManagingWatchlistSignal = signal(false);
  private readonly instrumentsSignal = signal<Instrument[]>([]);
  private readonly addSymbolErrorSignal = signal<AddSymbolError | null>(null);
  private readonly signalPrepProgressSignal = signal<SignalPrepProgress | null>(null);
  private sessionReady = false;

  readonly watchlists = this.watchlistsSignal.asReadonly();
  readonly watchlistItems = this.watchlistItemsSignal.asReadonly();
  readonly isLoadingItems = this.isLoadingItemsSignal.asReadonly();
  readonly isManagingWatchlist = this.isManagingWatchlistSignal.asReadonly();
  readonly selectedWatchlistId = this.selectedWatchlistIdSignal.asReadonly();
  readonly briefings = this.briefingsSignal.asReadonly();
  readonly isLoadingWatchlists = this.isLoadingWatchlistsSignal.asReadonly();
  readonly isLoadingBriefings = this.isLoadingBriefingsSignal.asReadonly();
  readonly isGenerating = this.isGeneratingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly instruments = this.instrumentsSignal.asReadonly();
  readonly addSymbolError = this.addSymbolErrorSignal.asReadonly();
  readonly signalPrepProgress = this.signalPrepProgressSignal.asReadonly();

  /** Uppercased set of every known instrument symbol, for O(1) validation/autocomplete. */
  readonly knownSymbols = computed(
    () => new Set(this.instrumentsSignal().map((instrument) => instrument.symbol.toUpperCase())),
  );

  /** Watchlist items enriched with their instrument display name for the preview. */
  readonly watchlistItemViews = computed<WatchlistItemView[]>(() => {
    const nameBySymbol = new Map(
      this.instrumentsSignal().map((instrument) => [instrument.symbol.toUpperCase(), instrument.name]),
    );
    return this.watchlistItemsSignal().map((item) => ({
      id: item.id,
      symbol: item.symbol,
      name: nameBySymbol.get(item.symbol.toUpperCase()) ?? item.symbol,
    }));
  });

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
    private readonly notifications: NotificationsStore,
    private readonly instrumentRepository: InstrumentRepository,
    private readonly signalRepository: SignalRepository,
  ) {}

  /** Loads the user's watchlists and auto-selects the first one, if any. */
  async init(): Promise<void> {
    // The known-instrument universe backs the add-symbol autocomplete/validation and the
    // enriched preview (issue #61); load it in the background — a failure just degrades to
    // no autocomplete, never blocks the page.
    void this.loadInstruments();

    if (this.sessionReady && this.watchlistsSignal().length > 0) {
      void this.loadWatchlists({ background: true });
      return;
    }

    await this.loadWatchlists();
    const first = this.watchlistsSignal()[0];
    if (first) {
      await this.selectWatchlist(first.id);
    }
    this.sessionReady = true;
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
    this.watchlistItemsSignal.set([]);
    this.errorSignal.set(null);
    if (!watchlistId) {
      return;
    }
    await Promise.all([this.loadBriefings(watchlistId), this.loadWatchlistItems(watchlistId)]);
  }

  async createWatchlist(name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed || this.isManagingWatchlistSignal()) {
      return;
    }
    this.isManagingWatchlistSignal.set(true);
    this.errorSignal.set(null);
    try {
      const watchlist = await this.watchlistRepository.createWatchlist(trimmed);
      this.watchlistsSignal.update((lists) => [...lists, watchlist]);
      await this.selectWatchlist(watchlist.id);
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
    } finally {
      this.isManagingWatchlistSignal.set(false);
    }
  }

  async deleteWatchlist(watchlistId: string): Promise<void> {
    if (this.isManagingWatchlistSignal()) {
      return;
    }
    this.isManagingWatchlistSignal.set(true);
    this.errorSignal.set(null);
    try {
      await this.watchlistRepository.deleteWatchlist(watchlistId);
      this.watchlistsSignal.update((lists) => lists.filter((w) => w.id !== watchlistId));
      if (this.selectedWatchlistIdSignal() === watchlistId) {
        const next = this.watchlistsSignal()[0]?.id ?? null;
        await this.selectWatchlist(next);
      }
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
    } finally {
      this.isManagingWatchlistSignal.set(false);
    }
  }

  /** Clears the "add symbol" validation error (e.g. when the user edits the input). */
  clearAddSymbolError(): void {
    this.addSymbolErrorSignal.set(null);
  }

  async addWatchlistItem(symbol: string): Promise<void> {
    const watchlistId = this.selectedWatchlistIdSignal();
    const trimmed = symbol.trim().toUpperCase();
    if (!watchlistId || !trimmed || this.isManagingWatchlistSignal()) {
      return;
    }

    // Validate against the known-instrument universe (issue #61): reject unknown tickers
    // like "APPPSDPSDP" up front instead of persisting garbage. Only enforced once the
    // universe has actually loaded, so a failed instruments fetch degrades to "no
    // client-side validation" rather than blocking every add.
    const known = this.knownSymbols();
    if (known.size > 0 && !known.has(trimmed)) {
      this.addSymbolErrorSignal.set('unknown');
      return;
    }
    if (this.watchlistItemsSignal().some((item) => item.symbol.toUpperCase() === trimmed)) {
      this.addSymbolErrorSignal.set('duplicate');
      return;
    }

    this.addSymbolErrorSignal.set(null);
    this.isManagingWatchlistSignal.set(true);
    this.errorSignal.set(null);
    try {
      const item = await this.watchlistRepository.addItem(watchlistId, trimmed);
      this.watchlistItemsSignal.update((items) => [...items, item]);
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
    } finally {
      this.isManagingWatchlistSignal.set(false);
    }
  }

  async removeWatchlistItem(itemId: string): Promise<void> {
    const watchlistId = this.selectedWatchlistIdSignal();
    if (!watchlistId || this.isManagingWatchlistSignal()) {
      return;
    }
    this.isManagingWatchlistSignal.set(true);
    this.errorSignal.set(null);
    try {
      await this.watchlistRepository.removeItem(watchlistId, itemId);
      this.watchlistItemsSignal.update((items) => items.filter((item) => item.id !== itemId));
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
    } finally {
      this.isManagingWatchlistSignal.set(false);
    }
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
    const watchlistId = this.selectedWatchlistIdSignal();
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
    const symbols = this.watchlistItemsSignal().map((item) => item.symbol);
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

  private async loadInstruments(): Promise<void> {
    if (this.instrumentsSignal().length > 0) {
      return;
    }
    try {
      this.instrumentsSignal.set(await this.instrumentRepository.fetchInstruments());
    } catch {
      this.instrumentsSignal.set([]);
    }
  }

  private async loadWatchlistItems(watchlistId: string): Promise<void> {
    this.isLoadingItemsSignal.set(true);
    try {
      const items = await this.watchlistRepository.listItems(watchlistId);
      this.watchlistItemsSignal.set(items);
    } catch {
      this.watchlistItemsSignal.set([]);
    } finally {
      this.isLoadingItemsSignal.set(false);
    }
  }

  private async loadWatchlists(options?: { background?: boolean }): Promise<void> {
    const background = options?.background ?? false;
    if (!background && this.watchlistsSignal().length === 0) {
      this.isLoadingWatchlistsSignal.set(true);
    }
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
