import { Injectable, computed, signal } from '@angular/core';
import {
  MarketStats,
  NewsItem,
  NewsNotAnalyzableError,
  NewsRepository,
  NewsSkipReason,
  QuantRepository,
  Signal,
  SignalRepository,
} from '../domain';

/** How many hours back to look for related news on the detail page. */
const RELATED_NEWS_WINDOW_HOURS = 168;
/** Related-news cards per page in the paginated list. */
const RELATED_NEWS_PAGE_SIZE = 6;
/** Cap on affected-instrument price lookups per article (one quant call each). */
const MAX_AFFECTED_INSTRUMENTS = 8;

/**
 * Signal-based facade for the per-news detail page (issue #38). Owns the
 * single-item view state so the page works after a hard refresh — it fetches
 * the item by id via `NewsRepository.getNewsById` instead of reading the
 * in-memory radar feed.
 *
 * When the item has a linked signal (`analysisStatus === 'analyzed'`), it also
 * resolves that `Signal` (via `SignalRepository`) so the page can reuse the
 * radar's AI-analysis UI. Provided in the detail page component's `providers`
 * so each navigation gets a fresh instance (see `NewsDetailPageComponent`).
 */
@Injectable()
export class NewsDetailStore {
  private readonly newsSignal = signal<NewsItem | null>(null);
  private readonly linkedSignal = signal<Signal | null>(null);
  private readonly affectedInstrumentsSignal = signal<MarketStats[]>([]);
  private readonly relatedNewsSignal = signal<NewsItem[]>([]);
  private readonly relatedNewsPageSignal = signal(1);
  private readonly loadingSignal = signal(false);
  private readonly notFoundSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly generatingSignal = signal(false);
  private readonly analyzeErrorSignal = signal<string | null>(null);
  private readonly analyzeRejectionSignal = signal<NewsSkipReason | null>(null);

  readonly news = this.newsSignal.asReadonly();
  readonly signal = this.linkedSignal.asReadonly();
  /** Live price + %change for each instrument the article affects (chips link to `radar/:symbol`). */
  readonly affectedInstruments = this.affectedInstrumentsSignal.asReadonly();
  /** Other recent articles touching the same primary instrument (rendered as news cards). */
  readonly relatedNews = this.relatedNewsSignal.asReadonly();
  /** 1-based current page of the related-news list. */
  readonly relatedNewsPage = this.relatedNewsPageSignal.asReadonly();
  /** Total related-news pages (at least 1). */
  readonly relatedNewsPageCount = computed(() =>
    Math.max(1, Math.ceil(this.relatedNewsSignal().length / RELATED_NEWS_PAGE_SIZE)),
  );
  /** Related-news slice for the current page. */
  readonly relatedNewsPageItems = computed(() => {
    const start = (this.relatedNewsPageSignal() - 1) * RELATED_NEWS_PAGE_SIZE;
    return this.relatedNewsSignal().slice(start, start + RELATED_NEWS_PAGE_SIZE);
  });
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly isNotFound = this.notFoundSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly isGenerating = this.generatingSignal.asReadonly();
  /** Transport-level failure of the last "Analizar ahora" run (timeout, 5xx, offline). */
  readonly analyzeError = this.analyzeErrorSignal.asReadonly();
  /**
   * Reason the last "Analizar ahora" run was rejected by the backend (a 422), when it ran
   * but couldn't produce a signal. Distinct from `analyzeError`: this is an explainable
   * outcome ("not enough distinct sources yet"), not a broken request.
   */
  readonly analyzeRejection = this.analyzeRejectionSignal.asReadonly();

  /** Primary instrument the article links to — the target of the "Analizar ahora" action. */
  readonly primarySymbol = computed(() => this.newsSignal()?.relatedSymbols[0] ?? null);

  /**
   * Why this article has no signal — the freshest reason available: a rejection from a
   * manual run this session, else whatever the backend last persisted on the item.
   * `null` when there's nothing to explain.
   */
  readonly skipReason = computed<NewsSkipReason | null>(
    () => this.analyzeRejectionSignal() ?? this.newsSignal()?.skipReason ?? null,
  );

  /**
   * Whether the article is linked to any instrument. Signals are generated per instrument,
   * so an article linked to none simply cannot be classified — the "Analizar ahora" button
   * is disabled (with an explanation) rather than offering an action that cannot succeed.
   */
  readonly hasLinkedInstrument = computed(() => this.primarySymbol() !== null);

  /** Whether "Analizar ahora" can run right now. */
  readonly canAnalyze = computed(() => this.hasLinkedInstrument() && !this.generatingSignal());

  constructor(
    private readonly newsRepository: NewsRepository,
    private readonly signalRepository: SignalRepository,
    private readonly quantRepository: QuantRepository,
  ) {}

  async load(id: string): Promise<void> {
    this.loadingSignal.set(true);
    this.notFoundSignal.set(false);
    this.errorSignal.set(null);
    this.analyzeErrorSignal.set(null);
    this.analyzeRejectionSignal.set(null);
    this.newsSignal.set(null);
    this.linkedSignal.set(null);
    this.affectedInstrumentsSignal.set([]);
    this.relatedNewsSignal.set([]);
    this.relatedNewsPageSignal.set(1);
    try {
      const news = await this.newsRepository.getNewsById(id);
      if (news === null) {
        this.notFoundSignal.set(true);
        return;
      }
      this.newsSignal.set(news);
      await Promise.all([
        this.resolveLinkedSignal(news),
        this.loadAffectedInstruments(news),
        this.loadRelatedNews(news),
      ]);
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Fetch live price + %change for each affected instrument via the public quant endpoint,
   * so the affected-instrument chips are actionable (price/%change + link) instead of bare
   * tickers. Best-effort per symbol: a failed lookup is dropped, never blanking the page.
   */
  private async loadAffectedInstruments(news: NewsItem): Promise<void> {
    const symbols = news.relatedSymbols.slice(0, MAX_AFFECTED_INSTRUMENTS);
    const stats = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          return await this.quantRepository.fetchMarketStats(symbol);
        } catch {
          return null;
        }
      }),
    );
    this.affectedInstrumentsSignal.set(stats.filter((stat): stat is MarketStats => stat !== null));
  }

  /** Load other recent articles touching the primary instrument, excluding this one. */
  private async loadRelatedNews(news: NewsItem): Promise<void> {
    const symbol = news.relatedSymbols[0];
    if (!symbol) {
      return;
    }
    try {
      const items = await this.newsRepository.fetchNews({
        assetClass: null,
        symbol,
        sinceHours: RELATED_NEWS_WINDOW_HOURS,
      });
      this.relatedNewsSignal.set(items.filter((item) => item.id !== news.id));
    } catch {
      this.relatedNewsSignal.set([]);
    }
  }

  /** Move the related-news list to `page` (1-based), clamped to the valid range. */
  setRelatedNewsPage(page: number): void {
    this.relatedNewsPageSignal.set(Math.min(Math.max(1, page), this.relatedNewsPageCount()));
  }

  /**
   * "Analizar ahora" (issue #27): force-analyzes THIS article, bypassing the backend's cost
   * pre-filter, and renders the fresh signal in place — no page reload.
   *
   * Previously this called `SignalRepository.generateSignal(symbol)`, which is per-instrument:
   * it re-classified the whole symbol and never linked the resulting signal back to the
   * article the user was looking at, so `analysisStatus` stayed as it was and the item still
   * read as unclassified everywhere else in the app. `NewsRepository.analyzeNewsItem` targets
   * the item, links the signal, and returns the refreshed row — which is why we replace the
   * whole `news` state from the response rather than just dropping a `Signal` into place.
   *
   * A 422 (`NewsNotAnalyzableError`) is not an error banner: it means the run happened and
   * couldn't produce a signal for an explainable reason, which the page renders as prose.
   */
  async analyze(): Promise<void> {
    const news = this.newsSignal();
    if (!news || !this.canAnalyze()) {
      return;
    }
    this.generatingSignal.set(true);
    this.analyzeErrorSignal.set(null);
    this.analyzeRejectionSignal.set(null);
    try {
      const analyzed = await this.newsRepository.analyzeNewsItem(news.id);
      this.newsSignal.set(analyzed);
      this.linkedSignal.set(null);
      // `refresh: true` is load-bearing: the signal we're looking for was created seconds
      // ago, so the TTL-cached signal list from page load can't contain it.
      await this.resolveLinkedSignal(analyzed, { refresh: true });
    } catch (error: unknown) {
      if (error instanceof NewsNotAnalyzableError) {
        this.analyzeRejectionSignal.set(error.skipReason);
      } else {
        this.analyzeErrorSignal.set(this.toErrorMessage(error));
      }
    } finally {
      this.generatingSignal.set(false);
    }
  }

  /**
   * Resolves the `Signal` referenced by `news.signalId` (if any) by scanning
   * the signals recorded for the article's related instruments. Swallowed on
   * failure per symbol — the linked signal is enrichment on top of the news
   * detail, so a lookup failing shouldn't blank out the page.
   */
  private async resolveLinkedSignal(
    news: NewsItem,
    options?: { refresh?: boolean },
  ): Promise<void> {
    if (!news.signalId) {
      return;
    }
    for (const symbol of news.relatedSymbols) {
      try {
        const signals = await this.signalRepository.fetchSignals(symbol, options);
        const match = signals.find((candidate) => candidate.id === news.signalId);
        if (match) {
          this.linkedSignal.set(match);
          return;
        }
      } catch {
        // Try the next related symbol.
      }
    }
  }

  private toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error while loading the news item';
  }
}
