import { Injectable, computed, signal } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { AppConfigService, NotificationsStore } from '../../../core';
import { ReviewDecision, ReviewState } from '../../briefings/domain';
import {
  AssetClass,
  DEFAULT_RADAR_FILTERS,
  ImpactClass,
  Instrument,
  InstrumentRepository,
  MacroRepository,
  MacroState,
  MarketStats,
  NewsItem,
  NewsRepository,
  QuantRepository,
  RadarFilters,
  Signal,
  SignalRepository,
  SignalReviewRepository,
} from '../domain';
import { computeRadarLandscape } from './compute-radar-landscape';
import { computeMarketScore, MarketScore } from './compute-market-score';
import { formatNewNewsNotificationDetail } from './format-new-signals-detail';
import { groupNewsByInstrument } from './group-news-by-instrument';
import { latestSignalBySymbol } from './latest-signal-by-symbol';
import { mapInBatches } from './map-in-batches';

export interface NewsTimelineEntry {
  news: NewsItem;
  symbol: string;
  impactClass?: ImpactClass;
  confidence?: number;
}

export interface RadarKpiSummary {
  newsDetected: number;
  pendingReview: number;
  instruments: number;
  activeAlerts: number;
  newsTrend: number;
}

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
 * has new items — never one per tick regardless of change, and never one
 * per new item. That call's `detail` names the distinct instrument symbols
 * the new items relate to (via `formatNewSignalsDetail`), truncated past a
 * small count, so the notification isn't just a bare number.
 *
 * `RadarStore` is app-scoped (`providedIn: 'root'`) so revisiting Radar shows
 * the last loaded feed instantly and refreshes in the background. The poll loop
 * is started by `init()` and stopped by `pausePolling()` when the user leaves
 * the page — see `RadarPageComponent`.
 */
@Injectable({ providedIn: 'root' })
export class RadarStore {
  private readonly filtersSignal = signal<RadarFilters>(DEFAULT_RADAR_FILTERS);
  private readonly newsSignal = signal<NewsItem[]>([]);
  private readonly instrumentsSignal = signal<Instrument[]>([]);
  /** Latest signal per instrument symbol, populated alongside `newsSignal` (see `loadNews`/`pollNews`). */
  private readonly signalsBySymbolSignal = signal<Map<string, Signal>>(new Map());
  private readonly marketStatsBySymbolSignal = signal<Map<string, MarketStats>>(new Map());
  private readonly macroStateSignal = signal<MacroState | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly isEnrichingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly generatingSymbolSignal = signal<string | null>(null);
  private readonly reviewHistorySignal = signal<Record<string, ReviewState[]>>({});
  private readonly reviewErrorsSignal = signal<Record<string, string | null>>({});
  private readonly submittingSignalIdsSignal = signal<ReadonlySet<string>>(new Set());
  /** IDs from the last successful fetch (initial or poll). `null` until the
   * first fetch resolves, so the very first poll tick after `init()` never
   * fires a "new items" notification for the whole initial page load. */
  private lastSeenNewsIds: Set<string> | null = null;
  private pollSubscription: Subscription | null = null;
  private sessionReady = false;

  readonly filters = this.filtersSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly isEnriching = this.isEnrichingSignal.asReadonly();
  readonly macroState = this.macroStateSignal.asReadonly();
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

  /** One card per instrument that has linked news in the active filter window,
   * enriched with the latest Analyst signal for that instrument when one exists. */
  readonly signals = computed(() => {
    const signalsBySymbol = this.signalsBySymbolSignal();
    const marketStatsBySymbol = this.marketStatsBySymbolSignal();
    return this.grouped().signals.map((radarSignal) => {
      const signal = signalsBySymbol.get(radarSignal.symbol);
      const marketStats = marketStatsBySymbol.get(radarSignal.symbol);
      return {
        ...radarSignal,
        impactClass: signal?.impactClass,
        confidence: signal?.confidence,
        priceDelta: signal?.priceDelta ?? marketStats?.priceDeltaPct ?? undefined,
        signalId: signal?.id,
        marketStats,
      };
    });
  });
  readonly landscape = computed(() => computeRadarLandscape(this.signals()));
  readonly marketScore = computed((): MarketScore => {
    const landscape = this.landscape();
    return computeMarketScore(landscape.distribution, landscape.totalInstruments);
  });
  readonly newsTimeline = computed((): NewsTimelineEntry[] => {
    const entries: NewsTimelineEntry[] = [];
    for (const signal of this.signals()) {
      for (const news of signal.news) {
        entries.push({
          news,
          symbol: signal.symbol,
          impactClass: signal.impactClass,
          confidence: signal.confidence,
        });
      }
    }
    return entries.sort(
      (left, right) =>
        new Date(right.news.publishedAt).getTime() - new Date(left.news.publishedAt).getTime(),
    );
  });
  readonly kpiSummary = computed((): RadarKpiSummary => {
    const landscape = this.landscape();
    const sinceHours = this.filtersSignal().sinceHours;
    const midpoint = Date.now() - (sinceHours / 2) * 3_600_000;
    let recentHalf = 0;
    let olderHalf = 0;

    for (const item of this.newsSignal()) {
      if (new Date(item.publishedAt).getTime() >= midpoint) {
        recentHalf += 1;
      } else {
        olderHalf += 1;
      }
    }

    return {
      newsDetected: landscape.totalNewsItems,
      pendingReview: this.unclassifiedCount(),
      instruments: landscape.totalInstruments,
      activeAlerts: this.unclassifiedCount(),
      newsTrend: recentHalf - olderHalf,
    };
  });
  /** News items fetched but not linked to any instrument — surfaced, not dropped silently. */
  readonly unlinkedNewsCount = computed(() => this.grouped().unlinkedCount);
  readonly isEmpty = computed(
    () => !this.loadingSignal() && !this.errorSignal() && this.signals().length === 0,
  );
  readonly unclassifiedCount = computed(
    () => this.signals().filter((signal) => !signal.impactClass).length,
  );
  readonly isGeneratingAny = computed(() => this.generatingSymbolSignal() !== null);

  constructor(
    private readonly newsRepository: NewsRepository,
    private readonly instrumentRepository: InstrumentRepository,
    private readonly signalRepository: SignalRepository,
    private readonly signalReviewRepository: SignalReviewRepository,
    private readonly quantRepository: QuantRepository,
    private readonly macroRepository: MacroRepository,
    private readonly config: AppConfigService,
    private readonly notifications: NotificationsStore,
  ) {}

  /** Loads instruments + news on first visit; revisits show cached state and refresh silently. */
  async init(): Promise<void> {
    this.startAutoRefresh();

    if (this.sessionReady) {
      void this.loadNews({ background: true });
      return;
    }

    void this.loadInstruments();
    void this.loadMacroState();
    await this.loadNews();
    this.sessionReady = true;
  }

  /** Stops background polling when navigating away from Radar. */
  pausePolling(): void {
    this.pollSubscription?.unsubscribe();
    this.pollSubscription = null;
  }

  async retry(): Promise<void> {
    await Promise.all([this.loadInstruments(), this.loadNews()]);
  }

  async setAssetClass(assetClass: AssetClass | null): Promise<void> {
    if (this.filtersSignal().assetClass === assetClass) {
      return;
    }
    // Changing instrument type invalidates a more specific asset selection.
    this.filtersSignal.update((filters) => ({ ...filters, assetClass, symbol: null }));
    await this.loadNews({ forceLoading: true });
  }

  async setSymbol(symbol: string | null): Promise<void> {
    if (this.filtersSignal().symbol === symbol) {
      return;
    }
    this.filtersSignal.update((filters) => ({ ...filters, symbol }));
    await this.loadNews({ forceLoading: true });
  }

  async setSinceHours(sinceHours: number): Promise<void> {
    if (this.filtersSignal().sinceHours === sinceHours) {
      return;
    }
    this.filtersSignal.update((filters) => ({ ...filters, sinceHours }));
    await this.loadNews({ forceLoading: true });
  }

  isGeneratingFor(symbol: string): boolean {
    return this.generatingSymbolSignal() === symbol;
  }

  reviewHistoryFor(signalId: string): ReviewState[] {
    return this.reviewHistorySignal()[signalId] ?? [];
  }

  isSubmittingReviewFor(signalId: string): boolean {
    return this.submittingSignalIdsSignal().has(signalId);
  }

  reviewErrorFor(signalId: string): string | null {
    return this.reviewErrorsSignal()[signalId] ?? null;
  }

  async ensureSignalReviews(signalId: string): Promise<void> {
    if (this.reviewHistorySignal()[signalId]) {
      return;
    }
    try {
      const history = await this.signalReviewRepository.listSignalReviews(signalId);
      this.reviewHistorySignal.update((current) => ({ ...current, [signalId]: history }));
    } catch {
      this.reviewHistorySignal.update((current) => ({ ...current, [signalId]: [] }));
    }
  }

  async generateSignal(symbol: string): Promise<void> {
    if (this.generatingSymbolSignal()) {
      return;
    }
    this.generatingSymbolSignal.set(symbol);
    try {
      const signal = await this.signalRepository.generateSignal(symbol);
      this.signalsBySymbolSignal.update((current) => {
        const next = new Map(current);
        next.set(symbol, signal);
        return next;
      });
      this.notifications.notify('radar', 'notifications.radar.signalGenerated', 1, symbol);
      await this.ensureSignalReviews(signal.id);
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
    } finally {
      this.generatingSymbolSignal.set(null);
    }
  }

  async generateAllUnclassified(): Promise<void> {
    const symbols = this.signals()
      .filter((signal) => !signal.impactClass)
      .map((signal) => signal.symbol);
    for (const symbol of symbols) {
      await this.generateSignal(symbol);
    }
  }

  async submitSignalReview(
    signalId: string,
    decision: ReviewDecision,
    justification: string,
  ): Promise<void> {
    if (this.submittingSignalIdsSignal().has(signalId)) {
      return;
    }
    this.submittingSignalIdsSignal.update((ids) => new Set([...ids, signalId]));
    this.reviewErrorsSignal.update((errors) => ({ ...errors, [signalId]: null }));
    try {
      const review = await this.signalReviewRepository.submitSignalReview(
        signalId,
        decision,
        justification,
      );
      this.reviewHistorySignal.update((current) => ({
        ...current,
        [signalId]: [...(current[signalId] ?? []), review],
      }));
    } catch (error: unknown) {
      this.reviewErrorsSignal.update((errors) => ({
        ...errors,
        [signalId]: this.toErrorMessage(error),
      }));
    } finally {
      this.submittingSignalIdsSignal.update((ids) => {
        const next = new Set(ids);
        next.delete(signalId);
        return next;
      });
    }
  }

  /**
   * News-derived symbols scoped to the curated instrument universe. News
   * entity extraction (marketaux/newsapi) surfaces plenty of tickers the
   * backend's `quant/stats`/`signals` endpoints never onboarded (foreign
   * exchanges, OTC tickers, etc.), which otherwise 404s `quant/stats` on
   * every poll tick for no actionable data. Fails open (returns every
   * symbol unfiltered) while `instrumentsSignal` hasn't loaded yet, so a
   * slow/failed instruments fetch never blanks out enrichment.
   */
  private trackedSymbols(news: NewsItem[]): string[] {
    const symbols = Array.from(new Set(news.flatMap((item) => item.relatedSymbols)));
    const instruments = this.instrumentsSignal();
    if (instruments.length === 0) {
      return symbols;
    }
    const known = new Set(instruments.map((instrument) => instrument.symbol.toUpperCase()));
    return symbols.filter((symbol) => known.has(symbol.toUpperCase()));
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

  private async loadNews(options?: {
    background?: boolean;
    forceLoading?: boolean;
  }): Promise<void> {
    const background = options?.background ?? false;
    const forceLoading = options?.forceLoading ?? false;
    if (forceLoading || (!background && this.newsSignal().length === 0)) {
      this.loadingSignal.set(true);
    }
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
      if (!background) {
        this.loadingSignal.set(false);
      }
      void this.enrichFeed(news);
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
      this.newsSignal.set([]);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  private async enrichFeed(news: NewsItem[]): Promise<void> {
    this.isEnrichingSignal.set(true);
    try {
      await Promise.all([this.loadSignals(news), this.loadMarketStats(news)]);
    } finally {
      this.isEnrichingSignal.set(false);
    }
  }

  private async loadMacroState(): Promise<void> {
    try {
      const macro = await this.macroRepository.fetchMacroState();
      this.macroStateSignal.set(macro);
    } catch {
      this.macroStateSignal.set(null);
    }
  }

  private async loadMarketStats(news: NewsItem[]): Promise<void> {
    const symbols = this.trackedSymbols(news);
    const fetched = await mapInBatches(
      symbols,
      this.config.radarSignalFetchBatchSize,
      async (symbol) => {
        try {
          const stats = await this.quantRepository.fetchMarketStats(symbol);
          return [symbol, stats] as const;
        } catch {
          return null;
        }
      },
    );

    const next = new Map(this.marketStatsBySymbolSignal());
    for (const entry of fetched) {
      if (entry) {
        next.set(entry[0], entry[1]);
      }
    }
    this.marketStatsBySymbolSignal.set(next);
  }

  /**
   * Fetches the latest signal for every instrument symbol referenced by
   * `news` and merges the result into `signalsBySymbolSignal`. Swallowed on
   * failure per symbol — a signal is enrichment on top of the news feed, so
   * one instrument's fetch failing shouldn't blank out the others or the
   * page itself (same posture as `loadInstruments`).
   */
  private async loadSignals(news: NewsItem[]): Promise<void> {
    const symbols = this.trackedSymbols(news);
    const fetched = await mapInBatches(
      symbols,
      this.config.radarSignalFetchBatchSize,
      async (symbol) => {
        try {
          return await this.signalRepository.fetchSignals(symbol);
        } catch {
          return [];
        }
      },
    );
    this.signalsBySymbolSignal.set(latestSignalBySymbol(fetched.flat()));
  }

  /** Starts the auto-refresh poll loop while the Radar page is active. */
  private startAutoRefresh(): void {
    if (this.pollSubscription) {
      return;
    }

    this.pollSubscription = interval(this.config.radarPollIntervalMs).subscribe(
      () => void this.pollNews(),
    );
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
          this.notifications.notify(
            'radar',
            'notifications.radar.newSignals',
            newItems.length,
            formatNewNewsNotificationDetail(newItems),
          );
        }
      }

      this.lastSeenNewsIds = currentIds;
      this.newsSignal.set(news);
      await this.enrichFeed(news);
    } catch {
      // Silent by design (see class doc) — a background poll failure
      // shouldn't surface a page-level error banner over otherwise-good data.
    }
  }

  private toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error while loading radar data';
  }
}
