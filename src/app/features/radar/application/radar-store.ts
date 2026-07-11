import { Injectable, computed, signal } from '@angular/core';
import {
  AssetClass,
  DEFAULT_RADAR_FILTERS,
  Instrument,
  InstrumentRepository,
  NewsItem,
  NewsRepository,
  RadarFilters,
} from '../domain';
import { groupNewsByInstrument } from './group-news-by-instrument';

/**
 * Signal-based state + facade for the radar feature. Presentation components
 * read `signals`/`isLoading`/`error`/`filters`/`instrumentOptions` and call
 * the `setXxx`/`retry` intents; they never touch `NewsRepository` or
 * `InstrumentRepository` directly.
 */
@Injectable()
export class RadarStore {
  private readonly filtersSignal = signal<RadarFilters>(DEFAULT_RADAR_FILTERS);
  private readonly newsSignal = signal<NewsItem[]>([]);
  private readonly instrumentsSignal = signal<Instrument[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly filters = this.filtersSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /** Instrument options for the "asset" filter, scoped to the selected instrument type. */
  readonly instrumentOptions = computed(() => {
    const assetClass = this.filtersSignal().assetClass;
    const all = this.instrumentsSignal();
    return assetClass ? all.filter((instrument) => instrument.assetClass === assetClass) : all;
  });

  private readonly grouped = computed(() => {
    const instrumentsBySymbol = new Map(
      this.instrumentsSignal().map((instrument) => [instrument.symbol, instrument] as const),
    );
    return groupNewsByInstrument(this.newsSignal(), instrumentsBySymbol);
  });

  /** One card per instrument that has linked news in the active filter window. */
  readonly signals = computed(() => this.grouped().signals);
  /** News items fetched but not linked to any instrument — surfaced, not dropped silently. */
  readonly unlinkedNewsCount = computed(() => this.grouped().unlinkedCount);
  readonly isEmpty = computed(
    () => !this.loadingSignal() && !this.errorSignal() && this.signals().length === 0,
  );

  constructor(
    private readonly newsRepository: NewsRepository,
    private readonly instrumentRepository: InstrumentRepository,
  ) {}

  /** Loads the instrument universe (once) and the initial news window. */
  async init(): Promise<void> {
    await Promise.all([this.loadInstruments(), this.loadNews()]);
  }

  async retry(): Promise<void> {
    await this.init();
  }

  async setAssetClass(assetClass: AssetClass | null): Promise<void> {
    if (this.filtersSignal().assetClass === assetClass) {
      return;
    }
    // Changing instrument type invalidates a more specific asset selection.
    this.filtersSignal.update((filters) => ({ ...filters, assetClass, symbol: null }));
    await this.loadNews();
  }

  async setSymbol(symbol: string | null): Promise<void> {
    if (this.filtersSignal().symbol === symbol) {
      return;
    }
    this.filtersSignal.update((filters) => ({ ...filters, symbol }));
    await this.loadNews();
  }

  async setSinceHours(sinceHours: number): Promise<void> {
    if (this.filtersSignal().sinceHours === sinceHours) {
      return;
    }
    this.filtersSignal.update((filters) => ({ ...filters, sinceHours }));
    await this.loadNews();
  }

  private async loadInstruments(): Promise<void> {
    try {
      const instruments = await this.instrumentRepository.fetchInstruments();
      this.instrumentsSignal.set(instruments);
    } catch {
      // Instrument metadata only affects card labels/filter options — a
      // failure here shouldn't block the news feed itself, so it's swallowed
      // rather than surfaced as a page-level error.
      this.instrumentsSignal.set([]);
    }
  }

  private async loadNews(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    try {
      const news = await this.newsRepository.fetchNews(this.filtersSignal());
      this.newsSignal.set(news);
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
      this.newsSignal.set([]);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  private toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error while loading radar data';
  }
}
