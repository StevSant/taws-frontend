import { Injectable, computed, signal } from '@angular/core';
import { AuthTokenService } from '../../../core';
import { WatchlistItem, WatchlistRepository } from '../../briefings/domain';
import {
  AssetClass,
  EnrichedInstrument,
  InstrumentHighlights,
  InstrumentSortField,
  MarketsRepository,
  SortDirection,
} from '../domain';

/** Rows per page in the explorer table. */
const PAGE_SIZE = 12;

/** Debounce (ms) applied to the inline search box so typing doesn't hammer the endpoint. */
const SEARCH_DEBOUNCE_MS = 300;

const EMPTY_HIGHLIGHTS: InstrumentHighlights = {
  topGainers: [],
  topLosers: [],
  mostVolatile: [],
  trending: [],
};

/**
 * Signal store for the markets explorer page (issue #59). Owns the filter/sort/search/page
 * query state and the enriched page result from `GET /api/v1/instruments/enriched` (one request
 * per view — the backend enriches every row, so there is no per-row fan-out here).
 *
 * Per-row follow/unfollow reuses the same auth-gated watchlist flow as the asset detail page:
 * the toggle is inert for anonymous users, updates optimistically, and re-syncs from the API;
 * failures surface on `watchlistError` and never throw to the page. Provided in the explorer
 * page component's `providers` so each visit gets a fresh instance.
 */
@Injectable()
export class MarketsExplorerStore {
  private readonly assetClassSignal = signal<AssetClass | null>(null);
  private readonly searchSignal = signal('');
  private readonly sortBySignal = signal<InstrumentSortField>('change');
  private readonly sortDirSignal = signal<SortDirection>('desc');
  private readonly pageSignal = signal(1);

  private readonly itemsSignal = signal<EnrichedInstrument[]>([]);
  private readonly highlightsSignal = signal<InstrumentHighlights>(EMPTY_HIGHLIGHTS);
  private readonly totalSignal = signal(0);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  private readonly watchlistIdSignal = signal<string | null>(null);
  private readonly watchlistItemsSignal = signal<WatchlistItem[]>([]);
  private readonly followBusySymbolSignal = signal<string | null>(null);
  private readonly watchlistErrorSignal = signal<string | null>(null);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly assetClass = this.assetClassSignal.asReadonly();
  readonly search = this.searchSignal.asReadonly();
  readonly sortBy = this.sortBySignal.asReadonly();
  readonly sortDir = this.sortDirSignal.asReadonly();
  readonly page = this.pageSignal.asReadonly();
  readonly pageSize = PAGE_SIZE;

  readonly items = this.itemsSignal.asReadonly();
  readonly highlights = this.highlightsSignal.asReadonly();
  readonly total = this.totalSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  readonly followBusySymbol = this.followBusySymbolSignal.asReadonly();
  readonly watchlistError = this.watchlistErrorSignal.asReadonly();
  /** Follow actions require an authenticated Supabase session (the `/watchlists` API is authed). */
  readonly watchlistAvailable = computed(() => this.authTokenService.currentToken() !== null);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalSignal() / PAGE_SIZE)));
  readonly isEmpty = computed(
    () => !this.loadingSignal() && !this.errorSignal() && this.itemsSignal().length === 0,
  );

  private readonly followedSymbols = computed(
    () => new Set(this.watchlistItemsSignal().map((item) => item.symbol.toUpperCase())),
  );

  constructor(
    private readonly marketsRepository: MarketsRepository,
    private readonly watchlistRepository: WatchlistRepository,
    private readonly authTokenService: AuthTokenService,
  ) {}

  isFollowed(symbol: string): boolean {
    return this.followedSymbols().has(symbol.toUpperCase());
  }

  async init(assetClass: AssetClass | null = null): Promise<void> {
    this.assetClassSignal.set(assetClass);
    await Promise.all([this.load(), this.loadWatchlistMembership()]);
  }

  async setAssetClass(assetClass: AssetClass | null): Promise<void> {
    this.assetClassSignal.set(assetClass);
    this.pageSignal.set(1);
    await this.load();
  }

  /** Debounced: updates the query immediately for the input, reloads after a short pause. */
  setSearch(value: string): void {
    this.searchSignal.set(value);
    this.pageSignal.set(1);
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => void this.load(), SEARCH_DEBOUNCE_MS);
  }

  async setSort(field: InstrumentSortField): Promise<void> {
    if (this.sortBySignal() === field) {
      this.sortDirSignal.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortBySignal.set(field);
      // Names read best ascending; price/change most useful highest-first.
      this.sortDirSignal.set(field === 'name' ? 'asc' : 'desc');
    }
    this.pageSignal.set(1);
    await this.load();
  }

  async setPage(page: number): Promise<void> {
    const clamped = Math.min(Math.max(page, 1), this.totalPages());
    if (clamped === this.pageSignal()) {
      return;
    }
    this.pageSignal.set(clamped);
    await this.load();
  }

  async retry(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    try {
      const result = await this.marketsRepository.fetchEnrichedInstruments({
        assetClass: this.assetClassSignal(),
        search: this.searchSignal(),
        sortBy: this.sortBySignal(),
        sortDir: this.sortDirSignal(),
        page: this.pageSignal(),
        pageSize: PAGE_SIZE,
      });
      this.itemsSignal.set(result.items);
      this.highlightsSignal.set(result.highlights);
      this.totalSignal.set(result.total);
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
      this.itemsSignal.set([]);
      this.highlightsSignal.set(EMPTY_HIGHLIGHTS);
      this.totalSignal.set(0);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Follow/unfollow one instrument from its table row without opening the detail page.
   * Optimistic: flips membership immediately, then persists and re-syncs. No-op when
   * unauthenticated; a duplicate add is a no-op because the row is already followed.
   */
  async toggleFollow(symbol: string, fallbackName: string): Promise<void> {
    if (!this.watchlistAvailable() || this.followBusySymbolSignal()) {
      return;
    }
    const normalized = symbol.toUpperCase();
    this.followBusySymbolSignal.set(normalized);
    this.watchlistErrorSignal.set(null);
    try {
      const watchlistId = await this.ensureWatchlistId(fallbackName);
      const existing = this.watchlistItemsSignal().find(
        (item) => item.symbol.toUpperCase() === normalized,
      );
      if (existing) {
        await this.watchlistRepository.removeItem(watchlistId, existing.id);
      } else {
        await this.watchlistRepository.addItem(watchlistId, normalized);
      }
      this.watchlistItemsSignal.set(await this.watchlistRepository.listItems(watchlistId));
    } catch (error: unknown) {
      this.watchlistErrorSignal.set(this.toErrorMessage(error));
    } finally {
      this.followBusySymbolSignal.set(null);
    }
  }

  private async ensureWatchlistId(fallbackName: string): Promise<string> {
    const current = this.watchlistIdSignal();
    if (current) {
      return current;
    }
    const watchlists = await this.watchlistRepository.fetchWatchlists();
    const existing = watchlists[0];
    if (existing) {
      this.watchlistIdSignal.set(existing.id);
      return existing.id;
    }
    const created = await this.watchlistRepository.createWatchlist(fallbackName);
    this.watchlistIdSignal.set(created.id);
    return created.id;
  }

  private async loadWatchlistMembership(): Promise<void> {
    if (!this.watchlistAvailable()) {
      return;
    }
    try {
      const watchlists = await this.watchlistRepository.fetchWatchlists();
      const first = watchlists[0];
      if (!first) {
        return;
      }
      this.watchlistIdSignal.set(first.id);
      this.watchlistItemsSignal.set(await this.watchlistRepository.listItems(first.id));
    } catch {
      // Best-effort — a failure just leaves every row showing "not followed".
    }
  }

  private toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error while loading the market list';
  }
}
