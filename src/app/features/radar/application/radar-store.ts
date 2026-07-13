import { Injectable, computed, signal } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import {
  AppConfigService,
  AuthTokenService,
  NewSignalsTracker,
  NotificationsStore,
} from '../../../core';
import { WatchlistStore } from '../../briefings/application';
import { ReviewDecision, ReviewState } from '../../briefings/domain';
import {
  AssetClass,
  DEFAULT_RADAR_FILTERS,
  ImpactClass,
  Instrument,
  InstrumentRepository,
  MacroRepository,
  MacroState,
  MarketPulse,
  MarketStats,
  NewsItem,
  NewsRepository,
  QuantRepository,
  RadarFilters,
  RadarSignal,
  SentimentRepository,
  Signal,
  SignalRepository,
  SignalReviewRepository,
} from '../domain';
import { computeRadarLandscape } from './compute-radar-landscape';
import { computeMarketScore, MarketScore } from './compute-market-score';
import { computeAssetClassSegments } from './compute-asset-class-segments';
import { computeMarketComposition } from './compute-market-composition';
import { groupNewsByInstrument } from './group-news-by-instrument';
import { latestSignalBySymbol } from './latest-signal-by-symbol';
import { mapInBatches } from './map-in-batches';

/** One instrument tied to a timeline article, with its own AI verdict. */
export interface NewsTimelineSymbol {
  symbol: string;
  impactClass?: ImpactClass;
  confidence?: number;
}

/**
 * A single news article on the radar timeline. An article can reference
 * several instruments at once, so it carries the full list of related
 * symbols (each with its own signal verdict) rather than being duplicated
 * once per instrument — see `newsTimeline`.
 */
export interface NewsTimelineEntry {
  news: NewsItem;
  symbols: NewsTimelineSymbol[];
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
 * position with a full-page spinner or error banner). Bell notifications for
 * new news are owned by `RadarNewsNotificationPoller` in the shell (global
 * poll on every page); this store only refreshes the radar UI.
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
  private readonly marketPulseSignal = signal<MarketPulse | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly isEnrichingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly newsErrorSignal = signal<string | null>(null);
  private readonly newsRetryingSignal = signal(false);
  private readonly generatingSymbolSignal = signal<string | null>(null);
  private readonly reviewHistorySignal = signal<Record<string, ReviewState[]>>({});
  private readonly reviewErrorsSignal = signal<Record<string, string | null>>({});
  private readonly submittingSignalIdsSignal = signal<ReadonlySet<string>>(new Set());
  private pollSubscription: Subscription | null = null;
  private sessionReady = false;

  readonly filters = this.filtersSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly isEnriching = this.isEnrichingSignal.asReadonly();
  readonly macroState = this.macroStateSignal.asReadonly();
  readonly marketPulse = this.marketPulseSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  /**
   * News-feed failure, scoped to the news section — deliberately NOT `error` (issue taws#71).
   *
   * `GET /api/v1/news` can be slow enough to trip `newsRequestTimeoutMs`, and routing that
   * into the page-level `error` wiped the entire radar with a full-page banner ("No se
   * pudieron cargar los datos del radar.Timeout has occurred") — instruments, macro cards
   * and all. The news feed is one section of the page, so its failure degrades that section
   * (retryable via `retryNews`) and leaves everything else standing.
   */
  readonly newsError = this.newsErrorSignal.asReadonly();
  readonly isNewsRetrying = this.newsRetryingSignal.asReadonly();

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
        thesis: signal?.thesis,
        keyDrivers: signal?.keyDrivers ?? [],
        riskFactors: signal?.riskFactors ?? [],
        analysisAvailable: signal?.analysisAvailable,
        disclaimer: signal?.disclaimer,
        marketStats,
      };
    });
  });
  /** `signals()` indexed by uppercase symbol, so the watchlist view can reuse enriched cards. */
  private readonly signalCardBySymbol = computed(() => {
    const map = new Map<string, RadarSignal>();
    for (const card of this.signals()) {
      map.set(card.symbol.toUpperCase(), card);
    }
    return map;
  });

  /**
   * Home instruments section when the user has a non-empty watchlist (issue #16): exactly the
   * watchlist symbols, in watchlist order. A symbol that already has a news-driven card reuses it
   * (full news + signal enrichment); one without recent news is synthesized from instrument
   * metadata plus any latest signal/quant stats, so it still appears — as an "unclassified" card,
   * the same way the radar renders any instrument the Analyst hasn't scored yet. Empty when the
   * watchlist is empty, so the page falls back to the news-driven universe.
   */
  readonly watchlistSignals = computed<RadarSignal[]>(() => {
    const symbols = this.watchlistStore.symbols();
    if (symbols.length === 0) {
      return [];
    }
    const cards = this.signalCardBySymbol();
    const instrumentsBySymbol = new Map(
      this.instrumentsSignal().map(
        (instrument) => [instrument.symbol.toUpperCase(), instrument] as const,
      ),
    );
    const signalsBySymbol = this.signalsBySymbolSignal();
    const marketStatsBySymbol = this.marketStatsBySymbolSignal();
    return symbols.map((symbol) => {
      const existing = cards.get(symbol);
      if (existing) {
        return existing;
      }
      const signal = signalsBySymbol.get(symbol);
      const marketStats = marketStatsBySymbol.get(symbol);
      return {
        symbol,
        instrument: instrumentsBySymbol.get(symbol),
        news: [],
        impactClass: signal?.impactClass,
        confidence: signal?.confidence,
        priceDelta: signal?.priceDelta ?? marketStats?.priceDeltaPct ?? undefined,
        signalId: signal?.id,
        thesis: signal?.thesis,
        keyDrivers: signal?.keyDrivers ?? [],
        riskFactors: signal?.riskFactors ?? [],
        analysisAvailable: signal?.analysisAvailable,
        disclaimer: signal?.disclaimer,
        marketStats,
      } satisfies RadarSignal;
    });
  });

  readonly landscape = computed(() => computeRadarLandscape(this.signals()));
  readonly marketScore = computed((): MarketScore => {
    const landscape = this.landscape();
    return computeMarketScore(landscape.distribution, landscape.totalInstruments);
  });
  /**
   * Per-asset-class segments (crypto / stocks / commodities / credit / forex),
   * each with its own impact distribution and market score. Derived from
   * `signals()` — no refetch. See issue #41.
   */
  readonly assetClassSegments = computed(() => computeAssetClassSegments(this.signals()));
  /** Global overview as a contribution-per-class breakdown, not a flat blend. */
  readonly marketComposition = computed(() =>
    computeMarketComposition(this.assetClassSegments(), this.signals().length),
  );
  readonly newsTimeline = computed((): NewsTimelineEntry[] => {
    // A multi-symbol article surfaces under every instrument it references,
    // so dedupe by `news.id`: each article appears once, accumulating the
    // full list of related symbols (with each symbol's own verdict). This
    // keeps the timeline's `track news.id` keys unique (NG0955) and shows
    // one card per story instead of N near-identical rows.
    const byNewsId = new Map<string, NewsTimelineEntry>();
    for (const signal of this.signals()) {
      for (const news of signal.news) {
        const related: NewsTimelineSymbol = {
          symbol: signal.symbol,
          impactClass: signal.impactClass,
          confidence: signal.confidence,
        };
        const existing = byNewsId.get(news.id);
        if (existing) {
          if (!existing.symbols.some((entry) => entry.symbol === related.symbol)) {
            existing.symbols.push(related);
          }
        } else {
          byNewsId.set(news.id, { news, symbols: [related] });
        }
      }
    }
    return Array.from(byNewsId.values()).sort(
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
  /**
   * Whether the page has any instrument card to render — news-driven or, for a user with a
   * watchlist, their followed instruments (which don't need the news feed to exist). This is
   * what lets the radar still render its instruments section when `loadNews` fails.
   */
  readonly hasSignals = computed(
    () => this.signals().length > 0 || this.watchlistSignals().length > 0,
  );
  readonly isEmpty = computed(
    () =>
      !this.loadingSignal() && !this.errorSignal() && !this.newsErrorSignal() && !this.hasSignals(),
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
    private readonly sentimentRepository: SentimentRepository,
    private readonly config: AppConfigService,
    private readonly notifications: NotificationsStore,
    private readonly authTokenService: AuthTokenService,
    private readonly newSignalsTracker: NewSignalsTracker,
    private readonly watchlistStore: WatchlistStore,
  ) {}

  /** Loads instruments + news on first visit; revisits show cached state and refresh silently. */
  async init(): Promise<void> {
    this.startAutoRefresh();

    if (this.sessionReady) {
      // Re-sync the watchlist on every revisit so follows made elsewhere (asset detail,
      // markets explorer) show up on the home section without a hard reload (issue #16).
      void this.watchlistStore.refresh();
      void this.loadNews({ background: true });
      return;
    }

    // First paint: load the user's watchlist so the instruments section can reflect it
    // before the (bottom-of-list) add-instrument widget mounts. Idempotent per session.
    void this.watchlistStore.ensureLoaded();

    void this.loadInstruments();
    void this.loadMarketContext();
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

  /**
   * Retries just the news feed, from the scoped "couldn't load news" state. Loads in the
   * background so the rest of the page (instruments, macro, KPIs) stays on screen instead
   * of being replaced by the full-page skeletons a foreground load would trigger.
   */
  async retryNews(): Promise<void> {
    if (this.newsRetryingSignal()) {
      return;
    }
    this.newsRetryingSignal.set(true);
    try {
      await this.loadNews({ background: true });
    } finally {
      this.newsRetryingSignal.set(false);
    }
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
    // Signal reviews are an authenticated-only resource, so fetching them
    // while anonymous is a guaranteed 401. Skip the request entirely for
    // anonymous users — they simply see no review history — instead of firing
    // a call that can't succeed (issue #39). Nothing is cached, so the fetch
    // runs normally once the user signs in and this is called again.
    if (!this.authTokenService.currentToken()) {
      return;
    }
    this.reviewErrorsSignal.update((errors) => ({ ...errors, [signalId]: null }));
    try {
      const history = await this.signalReviewRepository.listSignalReviews(signalId);
      this.reviewHistorySignal.update((current) => ({ ...current, [signalId]: history }));
    } catch (error: unknown) {
      // Don't collapse a failure into an empty history — that would
      // masquerade as "no reviews" and hide the problem. Surface it via the
      // review error channel instead. An expired-session 401 is handled
      // upstream by `authErrorInterceptor` (refresh + retry, or sign-out).
      this.reviewErrorsSignal.update((errors) => ({
        ...errors,
        [signalId]: this.toErrorMessage(error),
      }));
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
    const symbols = Array.from(new Set(news.flatMap((item) => item.relatedSymbols ?? [])));
    const instruments = this.instrumentsSignal();
    if (instruments.length === 0) {
      return symbols;
    }
    const known = new Set(instruments.map((instrument) => instrument.symbol.toUpperCase()));
    return symbols.filter((symbol) => known.has(symbol.toUpperCase()));
  }

  /**
   * Symbols worth enriching on a feed tick: everything the news feed references, PLUS every
   * watchlisted symbol.
   *
   * The watchlist half is not redundant. An instrument with no recent news never appears in
   * `news`, so scoping enrichment to news-derived symbols alone left exactly the cards the
   * user pinned with no signal and no price — rendering "unclassified" and "—" even when a
   * perfectly good signal was already stored. `signalsBySymbolSignal` is *replaced* on every
   * tick (unlike `marketStatsBySymbolSignal`, which merges), so a watchlisted symbol absent
   * from the feed was dropped from the map on each poll and could never recover.
   */
  private enrichmentSymbols(news: NewsItem[]): string[] {
    return Array.from(new Set([...this.trackedSymbols(news), ...this.watchlistStore.symbols()]));
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
    this.newsErrorSignal.set(null);
    try {
      const news = await this.newsRepository.fetchNews(this.filtersSignal());
      this.newsSignal.set(news);
      if (this.usesDefaultFilters()) {
        this.newSignalsTracker.syncBaseline(news);
      }
      if (!background) {
        this.loadingSignal.set(false);
      }
      void this.enrichFeed(news);
    } catch (error: unknown) {
      // Scoped to the news section, never the page (issue taws#71) — see `newsError`.
      this.newsErrorSignal.set(this.toErrorMessage(error));
      if (forceLoading) {
        // A filter change that failed: the feed on screen answers the *previous* filter, so
        // keeping it would silently mislabel it as the new one. Drop it and show the error.
        // Any other failure (first load, refresh, retry) keeps the last good feed on screen.
        this.newsSignal.set([]);
      }
    } finally {
      this.loadingSignal.set(false);
    }
  }

  private async enrichFeed(news: NewsItem[]): Promise<void> {
    this.isEnrichingSignal.set(true);
    try {
      // `init()` kicks the watchlist off without awaiting it so the news feed can paint first,
      // which means on first paint it may still be in flight — and `enrichmentSymbols` would
      // then see an empty watchlist and enrich news symbols only, leaving the watchlist cards
      // blank until the next poll tick. Awaiting it here (idempotent, and already resolved on
      // every tick after the first) is what makes the pinned cards correct on first paint.
      // Swallowed: a watchlist failure must still leave the news half of the feed enriched.
      await this.watchlistStore.ensureLoaded().catch(() => undefined);
      await Promise.all([this.loadSignals(news), this.loadMarketStats(news)]);
    } finally {
      this.isEnrichingSignal.set(false);
    }
  }

  private async loadMarketContext(): Promise<void> {
    await Promise.all([this.loadMacroState(), this.loadMarketPulse()]);
  }

  private async loadMacroState(): Promise<void> {
    try {
      const macro = await this.macroRepository.fetchMacroState();
      this.macroStateSignal.set(macro);
    } catch {
      this.macroStateSignal.set(null);
    }
  }

  private async loadMarketPulse(): Promise<void> {
    try {
      const pulse = await this.sentimentRepository.fetchMarketPulse();
      this.marketPulseSignal.set(pulse);
    } catch {
      this.marketPulseSignal.set(null);
    }
  }

  private async loadMarketStats(news: NewsItem[]): Promise<void> {
    const symbols = this.enrichmentSymbols(news);
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
   * Fetches the latest signal for every symbol in `enrichmentSymbols` (the news feed's
   * instruments plus the watchlist's) and replaces `signalsBySymbolSignal` with the result.
   * Swallowed on failure per symbol — a signal is enrichment on top of the news feed, so
   * one instrument's fetch failing shouldn't blank out the others or the page itself (same
   * posture as `loadInstruments`).
   */
  private async loadSignals(news: NewsItem[]): Promise<void> {
    const symbols = this.enrichmentSymbols(news);
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
      const previousIds = new Set(this.newsSignal().map((item) => item.id));
      const isEmptyFeed = previousIds.size === 0;
      const newItems = news.filter((item) => !previousIds.has(item.id));

      this.newsSignal.set(news);

      if (isEmptyFeed || newItems.length > 0) {
        await this.enrichFeed(news);
      }
    } catch {
      // Silent by design (see class doc) — a background poll failure
      // shouldn't surface a page-level error banner over otherwise-good data.
    }
  }

  private toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error while loading radar data';
  }

  private usesDefaultFilters(): boolean {
    const filters = this.filtersSignal();
    return (
      filters.sinceHours === DEFAULT_RADAR_FILTERS.sinceHours &&
      filters.symbol === DEFAULT_RADAR_FILTERS.symbol &&
      filters.assetClass === DEFAULT_RADAR_FILTERS.assetClass
    );
  }
}
