import { Injectable, computed, signal } from '@angular/core';
import { AuthTokenService, httpErrorDetail, TranslationService } from '../../../core';
import { WatchlistItem, WatchlistRepository } from '../../briefings/domain';
import {
  Instrument,
  InstrumentRepository,
  MarketStats,
  NewsItem,
  NewsRepository,
  QuantRepository,
  Signal,
  SignalRepository,
} from '../domain';

/** Window (hours) of related news shown on an asset detail page — wider than the radar default. */
const RELATED_NEWS_WINDOW_HOURS = 168;

/**
 * Signal-based facade for the per-asset detail page (`radar/:symbol`, issue #43). Owns the
 * single-instrument view state so the page survives a hard refresh — it resolves everything by
 * symbol from the backend instead of reading the in-memory radar feed.
 *
 * Loads, in parallel once the instrument is resolved: quant stats (price + OHLC candles), the
 * instrument's signals (latest surfaced with its AI analysis), and related news. Watchlist
 * membership is auth-gated (the `/watchlists` API is authenticated) — the toggle is inert for
 * anonymous users and every watchlist call is wrapped so a failure never blanks the page.
 *
 * Provided in the detail page component's `providers` so each navigation gets a fresh instance.
 */
@Injectable()
export class AssetDetailStore {
  private readonly symbolSignal = signal<string | null>(null);
  private readonly instrumentSignal = signal<Instrument | null>(null);
  private readonly marketStatsSignal = signal<MarketStats | null>(null);
  private readonly signalsSignal = signal<Signal[]>([]);
  private readonly relatedNewsSignal = signal<NewsItem[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly notFoundSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly generatingSignal = signal(false);

  private readonly watchlistIdSignal = signal<string | null>(null);
  private readonly watchlistItemsSignal = signal<WatchlistItem[]>([]);
  private readonly watchlistBusySignal = signal(false);
  private readonly watchlistErrorSignal = signal<string | null>(null);

  readonly symbol = this.symbolSignal.asReadonly();
  readonly instrument = this.instrumentSignal.asReadonly();
  readonly marketStats = this.marketStatsSignal.asReadonly();
  readonly signals = this.signalsSignal.asReadonly();
  readonly relatedNews = this.relatedNewsSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly isNotFound = this.notFoundSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly isGenerating = this.generatingSignal.asReadonly();

  readonly watchlistBusy = this.watchlistBusySignal.asReadonly();
  readonly watchlistError = this.watchlistErrorSignal.asReadonly();
  /** Watchlist actions require an authenticated Supabase session (see class doc). */
  readonly watchlistAvailable = computed(() => this.authTokenService.currentToken() !== null);

  /** OHLC candles feeding the price chart fallback; empty when quant has none. */
  readonly candles = computed(() => this.marketStatsSignal()?.candles ?? []);

  /** Most-recent signal for this instrument — the one whose AI analysis is surfaced. */
  readonly latestSignal = computed<Signal | null>(() => {
    const signals = this.signalsSignal();
    if (signals.length === 0) {
      return null;
    }
    return [...signals].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )[0];
  });

  readonly inWatchlist = computed(() => {
    const symbol = this.symbolSignal();
    if (!symbol) {
      return false;
    }
    return this.watchlistItemsSignal().some(
      (item) => item.symbol.toUpperCase() === symbol.toUpperCase(),
    );
  });

  constructor(
    private readonly instrumentRepository: InstrumentRepository,
    private readonly quantRepository: QuantRepository,
    private readonly signalRepository: SignalRepository,
    private readonly newsRepository: NewsRepository,
    private readonly watchlistRepository: WatchlistRepository,
    private readonly authTokenService: AuthTokenService,
    private readonly i18n: TranslationService,
  ) {}

  async load(symbol: string): Promise<void> {
    const normalized = symbol.trim().toUpperCase();
    this.symbolSignal.set(normalized);
    this.loadingSignal.set(true);
    this.notFoundSignal.set(false);
    this.errorSignal.set(null);
    this.instrumentSignal.set(null);
    this.marketStatsSignal.set(null);
    this.signalsSignal.set([]);
    this.relatedNewsSignal.set([]);
    this.watchlistItemsSignal.set([]);
    this.watchlistIdSignal.set(null);
    this.watchlistErrorSignal.set(null);

    try {
      const instruments = await this.instrumentRepository.fetchInstruments();
      const instrument = instruments.find(
        (candidate) => candidate.symbol.toUpperCase() === normalized,
      );
      if (!instrument) {
        this.notFoundSignal.set(true);
        return;
      }
      this.instrumentSignal.set(instrument);
      await Promise.all([
        this.loadMarketStats(normalized),
        this.loadSignals(normalized),
        this.loadRelatedNews(normalized),
        this.loadWatchlistMembership(),
      ]);
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async retry(): Promise<void> {
    const symbol = this.symbolSignal();
    if (symbol) {
      await this.load(symbol);
    }
  }

  /** Runs the Analyst pipeline for this instrument and surfaces the fresh signal. */
  async generate(): Promise<void> {
    const symbol = this.symbolSignal();
    if (!symbol || this.generatingSignal()) {
      return;
    }
    this.generatingSignal.set(true);
    this.errorSignal.set(null);
    try {
      const signal = await this.signalRepository.generateSignal(symbol);
      this.signalsSignal.update((signals) => [signal, ...signals]);
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
    } finally {
      this.generatingSignal.set(false);
    }
  }

  /**
   * Adds or removes the current instrument from the user's watchlist. Uses the first existing
   * watchlist; lazily creates one named `fallbackName` if the user has none. No-op when
   * unauthenticated. Errors surface on `watchlistError` and never throw to the page.
   */
  async toggleWatchlist(fallbackName: string): Promise<void> {
    if (!this.watchlistAvailable() || this.watchlistBusySignal()) {
      return;
    }
    const symbol = this.symbolSignal();
    if (!symbol) {
      return;
    }
    this.watchlistBusySignal.set(true);
    this.watchlistErrorSignal.set(null);
    try {
      const watchlistId = await this.ensureWatchlistId(fallbackName);
      const existing = this.watchlistItemsSignal().find(
        (item) => item.symbol.toUpperCase() === symbol.toUpperCase(),
      );
      if (existing) {
        await this.watchlistRepository.removeItem(watchlistId, existing.id);
      } else {
        await this.watchlistRepository.addItem(watchlistId, symbol);
      }
      this.watchlistItemsSignal.set(await this.watchlistRepository.listItems(watchlistId));
    } catch (error: unknown) {
      this.watchlistErrorSignal.set(this.toErrorMessage(error));
    } finally {
      this.watchlistBusySignal.set(false);
    }
  }

  private async ensureWatchlistId(fallbackName: string): Promise<string> {
    const current = this.watchlistIdSignal();
    if (current) {
      return current;
    }
    const created = await this.watchlistRepository.createWatchlist(fallbackName);
    this.watchlistIdSignal.set(created.id);
    return created.id;
  }

  private async loadMarketStats(symbol: string): Promise<void> {
    try {
      this.marketStatsSignal.set(await this.quantRepository.fetchMarketStats(symbol));
    } catch {
      // Quant stats are enrichment on top of the page — a failure leaves the
      // price block/chart empty rather than blanking the whole detail view.
      this.marketStatsSignal.set(null);
    }
  }

  private async loadSignals(symbol: string): Promise<void> {
    try {
      this.signalsSignal.set(await this.signalRepository.fetchSignals(symbol));
    } catch {
      this.signalsSignal.set([]);
    }
  }

  private async loadRelatedNews(symbol: string): Promise<void> {
    try {
      const news = await this.newsRepository.fetchNews({
        assetClass: null,
        symbol,
        sinceHours: RELATED_NEWS_WINDOW_HOURS,
      });
      this.relatedNewsSignal.set(news);
    } catch {
      this.relatedNewsSignal.set([]);
    }
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
      // Membership is best-effort — a failure just leaves the toggle showing
      // "not in watchlist"; the add/remove action re-fetches on success.
    }
  }

  /**
   * The translated **detail** (HTTP status + server detail, or a network-level message). Both
   * consumers prepend their own context: `error` via `radar.error.banner`, `watchlistError` via
   * `radar.detail.watchlist.error`. Full error kept in the console.
   */
  private toErrorMessage(error: unknown): string {
    console.error('Asset detail request failed', error);
    return httpErrorDetail(error, this.i18n);
  }
}
