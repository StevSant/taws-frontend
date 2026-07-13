import { Injectable, computed, signal } from '@angular/core';
import { AppConfigService } from '../../../core';
import {
  AnalysisStatus,
  AssetClass,
  DEFAULT_NEWS_BROWSE_QUERY,
  Instrument,
  InstrumentRepository,
  NewsBrowseQuery,
  NewsFacets,
  NewsItem,
  NewsRepository,
  NewsSortField,
  SentimentFilterOption,
  SortDirection,
} from '../domain';

/** Debounce (ms) on the search box so typing doesn't fire a request per keystroke. */
const SEARCH_DEBOUNCE_MS = 350;

const EMPTY_FACETS: NewsFacets = { sources: [], providers: [] };

/**
 * Signal-based facade for the numbered "all news" page (`radar/news`). Owns the browse
 * query (filters + sort + page) and the current page of items, fetched through
 * `NewsRepository.browseNews` (issue #70).
 *
 * Page-REPLACE, not accumulate: this used to append pages behind a "Load more" button,
 * which can't offer numbered navigation because the live feed never reports a total.
 * Browse is DB-backed and does, so `goToPage` swaps the item set outright.
 *
 * Any filter/sort change resets to page 1 — page 4 of the old result set is meaningless
 * against a new one, and would often land past the end.
 *
 * Provided in `NewsListPageComponent.providers` so each navigation gets a fresh instance.
 */
@Injectable()
export class NewsListStore {
  private readonly querySignal = signal<NewsBrowseQuery>(DEFAULT_NEWS_BROWSE_QUERY);
  private readonly itemsSignal = signal<NewsItem[]>([]);
  private readonly totalSignal = signal(0);
  private readonly facetsSignal = signal<NewsFacets>(EMPTY_FACETS);
  private readonly instrumentsSignal = signal<Instrument[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly query = this.querySignal.asReadonly();
  readonly items = this.itemsSignal.asReadonly();
  readonly total = this.totalSignal.asReadonly();
  readonly facets = this.facetsSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  readonly currentPage = computed(() => this.querySignal().page);
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalSignal() / this.querySignal().pageSize)),
  );

  readonly isEmpty = computed(
    () => !this.loadingSignal() && this.errorSignal() === null && this.itemsSignal().length === 0,
  );

  /** Instrument options for the "asset" filter, scoped to the selected instrument type. */
  readonly instrumentOptions = computed(() => {
    const assetClass = this.querySignal().assetClass;
    const all = this.instrumentsSignal();
    return assetClass ? all.filter((instrument) => instrument.assetClass === assetClass) : all;
  });

  constructor(
    private readonly newsRepository: NewsRepository,
    private readonly instrumentRepository: InstrumentRepository,
    private readonly config: AppConfigService,
  ) {
    this.querySignal.set({ ...DEFAULT_NEWS_BROWSE_QUERY, pageSize: this.config.newsListPageSize });
  }

  async init(): Promise<void> {
    await Promise.all([this.loadInstruments(), this.loadFacets(), this.load()]);
  }

  async retry(): Promise<void> {
    await this.load();
  }

  /** Jump to a 1-based page. No-op while loading, out of bounds, or already there. */
  async goToPage(page: number): Promise<void> {
    if (
      this.loadingSignal() ||
      page < 1 ||
      page > this.totalPages() ||
      page === this.currentPage()
    ) {
      return;
    }
    this.patchQuery({ page });
    await this.load();
  }

  async setAssetClass(assetClass: AssetClass | null): Promise<void> {
    // Changing the type resets the symbol — the old symbol may not belong to the new class.
    await this.applyFilter({ assetClass, symbol: null });
  }

  async setSymbol(symbol: string | null): Promise<void> {
    await this.applyFilter({ symbol });
  }

  async setSinceHours(sinceHours: number): Promise<void> {
    await this.applyFilter({ sinceHours });
  }

  async setSource(source: string | null): Promise<void> {
    await this.applyFilter({ source });
  }

  async setProvider(provider: string | null): Promise<void> {
    await this.applyFilter({ provider });
  }

  async setSentiment(sentiment: SentimentFilterOption | null): Promise<void> {
    await this.applyFilter({ sentiment });
  }

  async setAnalysisStatus(analysisStatus: AnalysisStatus | null): Promise<void> {
    await this.applyFilter({ analysisStatus });
  }

  async setSort(sortBy: NewsSortField, sortDir: SortDirection): Promise<void> {
    await this.applyFilter({ sortBy, sortDir });
  }

  /**
   * Debounced text search. The query signal updates immediately so the input stays
   * responsive, but the refetch (and the page-1 reset) waits until the user pauses.
   */
  setSearch(search: string): void {
    this.patchQuery({ search: search.trim() === '' ? null : search });
    if (this.searchTimer !== null) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.patchQuery({ page: 1 });
      void this.load();
    }, SEARCH_DEBOUNCE_MS);
  }

  /** Apply a filter/sort change, reset to page 1, and reload. */
  private async applyFilter(patch: Partial<NewsBrowseQuery>): Promise<void> {
    this.patchQuery({ ...patch, page: 1 });
    await this.load();
  }

  private patchQuery(patch: Partial<NewsBrowseQuery>): void {
    this.querySignal.update((query) => ({ ...query, ...patch }));
  }

  private async load(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    try {
      const page = await this.newsRepository.browseNews(this.querySignal());
      this.itemsSignal.set(page.items);
      this.totalSignal.set(page.total);
    } catch (error: unknown) {
      this.itemsSignal.set([]);
      this.totalSignal.set(0);
      this.errorSignal.set(this.toErrorMessage(error));
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /** Best-effort — the filter bar still works with empty dropdowns. */
  private async loadFacets(): Promise<void> {
    try {
      this.facetsSignal.set(await this.newsRepository.fetchNewsFacets());
    } catch {
      this.facetsSignal.set(EMPTY_FACETS);
    }
  }

  /** Best-effort — the filter bar still works without instrument options. */
  private async loadInstruments(): Promise<void> {
    try {
      this.instrumentsSignal.set(await this.instrumentRepository.fetchInstruments());
    } catch {
      this.instrumentsSignal.set([]);
    }
  }

  private toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error while loading news';
  }
}
