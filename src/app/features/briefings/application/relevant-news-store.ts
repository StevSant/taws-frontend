import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { httpErrorDetail, TranslationService } from '../../../core';
import { RelevantNews, RelevantNewsRepository } from '../domain';
import { BriefingPanelStore } from './briefing-panel-store';

/**
 * Recent news to pull in one request before filtering. Sized generously so the
 * client-side intersection with a watchlist's symbols has enough to work with,
 * without a per-symbol fan-out.
 */
const RECENT_NEWS_LIMIT = 40;

/** Maximum relevant-news cards the strip renders (most-recent first). */
const MAX_STRIP_ITEMS = 6;

/**
 * Page-scoped facade for the briefings "Noticias relevantes" strip.
 *
 * Fetches one unfiltered page of recent news via `RelevantNewsRepository`, then
 * intersects each article's `relatedSymbols` with the **selected watchlist's**
 * symbols — derived from `BriefingPanelStore` (`selectedWatchlistId()` +
 * `watchlistItems()`), the same store the page already uses. An internal effect
 * reloads whenever the selected watchlist (or its items) changes, so switching
 * lists refreshes the strip without any page-level plumbing.
 *
 * Provided at the page component level (not root) so the port→adapter binding
 * lives with the page and the strip stays self-contained.
 */
@Injectable()
export class RelevantNewsStore {
  private readonly repository = inject(RelevantNewsRepository);
  private readonly briefings = inject(BriefingPanelStore);
  private readonly i18n = inject(TranslationService);

  /** Full recent feed fetched once (unfiltered); the strip filters this by symbols. */
  private readonly recentSignal = signal<RelevantNews[]>([]);
  private readonly isLoadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  /**
   * The strip is "loading" while EITHER the recent feed is in flight OR the
   * selected watchlist's items are still resolving. Without the second clause
   * the strip briefly flashes its empty state ("no relevant news") between
   * selecting a watchlist and its symbols arriving — the intersection has no
   * symbols to match yet, so `relevantNews()` is momentarily empty even though
   * data is on the way. Gating on `BriefingPanelStore.isLoadingItems()` keeps
   * the skeleton up until symbols are known.
   */
  readonly isLoadingNews = computed(
    () =>
      this.isLoadingSignal() ||
      (this.briefings.selectedWatchlistId() !== null && this.briefings.isLoadingItems()),
  );
  readonly newsError = this.errorSignal.asReadonly();

  /** Uppercased symbols of the currently selected watchlist, from the shared briefings store. */
  private readonly selectedSymbols = computed(
    () => new Set(this.briefings.watchlistItems().map((item) => item.symbol.toUpperCase())),
  );

  /**
   * The strip's cards: recent articles whose `relatedSymbols` intersect the
   * selected watchlist, most-recent first, capped to `MAX_STRIP_ITEMS`. Empty
   * when no watchlist is selected or nothing matches.
   */
  readonly relevantNews = computed<RelevantNews[]>(() => {
    if (this.briefings.selectedWatchlistId() === null) {
      return [];
    }
    const symbols = this.selectedSymbols();
    if (symbols.size === 0) {
      return [];
    }
    return this.recentSignal()
      .filter((item) => item.relatedSymbols.some((symbol) => symbols.has(symbol)))
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
      .slice(0, MAX_STRIP_ITEMS);
  });

  constructor() {
    // Reload the recent feed whenever the selected watchlist (or its loaded
    // items) changes. Reading both signals registers this effect as their
    // dependent; the fetch itself is untracked via the async boundary.
    effect(() => {
      const selectedId = this.briefings.selectedWatchlistId();
      // Touch items so a late-arriving items load also triggers a (cached) refresh.
      this.briefings.watchlistItems();
      if (selectedId === null) {
        return;
      }
      void this.loadRecent();
    });
  }

  /** Re-fetches the recent feed and surfaces any error for the retry affordance. */
  async reload(): Promise<void> {
    await this.loadRecent();
  }

  private async loadRecent(): Promise<void> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);
    try {
      this.recentSignal.set(await this.repository.fetchRecent(RECENT_NEWS_LIMIT));
    } catch (error: unknown) {
      this.errorSignal.set(httpErrorDetail(error, this.i18n));
      this.recentSignal.set([]);
    } finally {
      this.isLoadingSignal.set(false);
    }
  }
}
