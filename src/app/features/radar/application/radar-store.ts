import { DestroyRef, Injectable, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { AppConfigService, NotificationsStore } from '../../../core';
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
 *
 * Also owns auto-refresh: once `init()` resolves, it polls `NewsRepository`
 * on an interval (`AppConfigService.radarPollIntervalMs`, config-driven —
 * not hardcoded) so the radar view picks up new signals without a manual
 * reload. The poll tick is a *silent* background refetch (it never toggles
 * `isLoading`/`error`, so it can't blow away the current filters/scroll
 * position with a full-page spinner or error banner) and diffs the fetched
 * news IDs against the previous tick's IDs to detect genuinely new items,
 * pushing exactly one `NotificationsStore.notify(...)` call per tick that
 * has new items — never one per tick regardless of change.
 *
 * `RadarStore` is provided per-navigation in `RadarPageComponent`'s
 * `providers` (feature-scoped DI), so its injector — and therefore the
 * `DestroyRef` the poll subscription is tied to via `takeUntilDestroyed` —
 * is destroyed when the component is destroyed (e.g. navigating away).
 * That's what stops the interval; there's no separate manual teardown.
 */
@Injectable()
export class RadarStore {
  private readonly filtersSignal = signal<RadarFilters>(DEFAULT_RADAR_FILTERS);
  private readonly newsSignal = signal<NewsItem[]>([]);
  private readonly instrumentsSignal = signal<Instrument[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  /** IDs from the last successful fetch (initial or poll). `null` until the
   * first fetch resolves, so the very first poll tick after `init()` never
   * fires a "new items" notification for the whole initial page load. */
  private lastSeenNewsIds: Set<string> | null = null;
  private pollingStarted = false;

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
    private readonly config: AppConfigService,
    private readonly notifications: NotificationsStore,
    private readonly destroyRef: DestroyRef,
  ) {}

  /** Loads the instrument universe (once), the initial news window, and starts auto-refresh. */
  async init(): Promise<void> {
    await Promise.all([this.loadInstruments(), this.loadNews()]);
    this.startAutoRefresh();
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
      // A foreground load (initial load or a filter change) re-establishes
      // the "known items" baseline without notifying — only a background
      // poll tick (see `pollNews`) diffs against this baseline and notifies,
      // so switching filters never spams a "new signals" notification for
      // items that were simply outside the old filter.
      this.lastSeenNewsIds = new Set(news.map((item) => item.id));
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
      this.newsSignal.set([]);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /** Starts the auto-refresh poll loop (once per `RadarStore` instance). */
  private startAutoRefresh(): void {
    if (this.pollingStarted) {
      return;
    }
    this.pollingStarted = true;

    interval(this.config.radarPollIntervalMs)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.pollNews());
  }

  /**
   * Background refetch used by the poll loop. Unlike `loadNews`, this never
   * toggles `isLoading`/`error` — a poll tick must not replace the page with
   * a spinner or blow away the current view on a transient failure, it just
   * silently keeps showing the last good data until the next successful
   * tick. Skips a tick entirely if a foreground load is already in flight,
   * to avoid two overlapping fetches racing each other.
   */
  private async pollNews(): Promise<void> {
    if (this.loadingSignal()) {
      return;
    }
    try {
      const news = await this.newsRepository.fetchNews(this.filtersSignal());
      const currentIds = new Set(news.map((item) => item.id));

      if (this.lastSeenNewsIds) {
        const newItems = news.filter((item) => !this.lastSeenNewsIds!.has(item.id));
        if (newItems.length > 0) {
          this.notifications.notify('radar', 'notifications.radar.newSignals', newItems.length);
        }
      }

      this.lastSeenNewsIds = currentIds;
      this.newsSignal.set(news);
    } catch {
      // Silent by design (see class doc) — a background poll failure
      // shouldn't surface a page-level error banner over otherwise-good data.
    }
  }

  private toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error while loading radar data';
  }
}
