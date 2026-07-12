import { Injectable, computed, signal } from '@angular/core';
import { AppConfigService } from '../../../core';
import {
  AssetClass,
  DEFAULT_RADAR_FILTERS,
  Instrument,
  InstrumentRepository,
  NewsItem,
  NewsRepository,
  RadarFilters,
} from '../domain';

/**
 * Signal-based facade for the paginated "all news" page (`radar/news`). Owns
 * the filter selection and the accumulated page list; fetches through
 * `NewsRepository.fetchNewsPage` (backend `limit`/`offset`/`has_more`) so the
 * page scales beyond the radar home timeline's single feed request.
 *
 * Provided in `NewsListPageComponent.providers` so each navigation gets a
 * fresh instance (same lifecycle as `NewsDetailStore`).
 */
@Injectable()
export class NewsListStore {
  private readonly filtersSignal = signal<RadarFilters>(DEFAULT_RADAR_FILTERS);
  private readonly itemsSignal = signal<NewsItem[]>([]);
  private readonly instrumentsSignal = signal<Instrument[]>([]);
  private readonly hasMoreSignal = signal(false);
  private readonly loadingSignal = signal(false);
  private readonly loadingMoreSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private offset = 0;

  readonly filters = this.filtersSignal.asReadonly();
  readonly items = this.itemsSignal.asReadonly();
  readonly hasMore = this.hasMoreSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly isLoadingMore = this.loadingMoreSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  readonly isEmpty = computed(
    () => !this.loadingSignal() && this.errorSignal() === null && this.itemsSignal().length === 0,
  );

  /** Instrument options for the "asset" filter, scoped to the selected instrument type. */
  readonly instrumentOptions = computed(() => {
    const assetClass = this.filtersSignal().assetClass;
    const all = this.instrumentsSignal();
    return assetClass ? all.filter((instrument) => instrument.assetClass === assetClass) : all;
  });

  constructor(
    private readonly newsRepository: NewsRepository,
    private readonly instrumentRepository: InstrumentRepository,
    private readonly config: AppConfigService,
  ) {}

  async init(): Promise<void> {
    await Promise.all([this.loadInstruments(), this.loadFirstPage()]);
  }

  async setAssetClass(assetClass: AssetClass | null): Promise<void> {
    // Changing the type resets the symbol — the old symbol may not belong to the new class.
    this.filtersSignal.update((filters) => ({ ...filters, assetClass, symbol: null }));
    await this.loadFirstPage();
  }

  async setSymbol(symbol: string | null): Promise<void> {
    this.filtersSignal.update((filters) => ({ ...filters, symbol }));
    await this.loadFirstPage();
  }

  async setSinceHours(sinceHours: number): Promise<void> {
    this.filtersSignal.update((filters) => ({ ...filters, sinceHours }));
    await this.loadFirstPage();
  }

  async retry(): Promise<void> {
    await this.loadFirstPage();
  }

  /** Appends the next page. No-op while a page is in flight or when exhausted. */
  async loadMore(): Promise<void> {
    if (!this.hasMoreSignal() || this.loadingMoreSignal() || this.loadingSignal()) {
      return;
    }
    this.loadingMoreSignal.set(true);
    try {
      const page = await this.newsRepository.fetchNewsPage(this.filtersSignal(), {
        limit: this.config.newsListPageSize,
        offset: this.offset,
      });
      this.itemsSignal.update((current) => [...current, ...page.items]);
      this.offset += page.items.length;
      this.hasMoreSignal.set(page.hasMore);
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
    } finally {
      this.loadingMoreSignal.set(false);
    }
  }

  private async loadFirstPage(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    this.offset = 0;
    try {
      const page = await this.newsRepository.fetchNewsPage(this.filtersSignal(), {
        limit: this.config.newsListPageSize,
        offset: 0,
      });
      this.itemsSignal.set(page.items);
      this.offset = page.items.length;
      this.hasMoreSignal.set(page.hasMore);
    } catch (error: unknown) {
      this.itemsSignal.set([]);
      this.hasMoreSignal.set(false);
      this.errorSignal.set(this.toErrorMessage(error));
    } finally {
      this.loadingSignal.set(false);
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
