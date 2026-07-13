import { Injectable, computed, signal } from '@angular/core';
import {
  NewsAssetImpact,
  NewsDetail,
  NewsItem,
  NewsNotAnalyzableError,
  NewsRepository,
  NewsSkipReason,
  Signal,
  SignalRepository,
} from '../domain';

/** Related-news cards per page in the paginated list. */
const RELATED_NEWS_PAGE_SIZE = 6;

/**
 * Signal-based facade for the per-news detail page (issue #38). Owns the
 * single-item view state so the page works after a hard refresh — it fetches
 * the item by id via `NewsRepository.getNewsDetail` instead of reading the
 * in-memory radar feed.
 *
 * The affected instruments (price, % change, sentiment, per-asset impact) and the related-news
 * list arrive with that one call (issue #57). They used to be assembled here — a
 * `fetchMarketStats` per related symbol plus a symbol-filtered `fetchNews` — which cost N+2
 * round trips and, worse, produced nothing at all for an article the backend linked to no
 * instrument: no symbol meant no prices AND no related news, so most of the page silently
 * collapsed. Relatedness is the backend's call now (shared symbols, else same source, else
 * recency), not a symbol lookup that can come back empty.
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
  private readonly affectedInstrumentsSignal = signal<NewsAssetImpact[]>([]);
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
  /** Live price + % change + per-asset impact for each instrument the article affects. */
  readonly affectedInstruments = this.affectedInstrumentsSignal.asReadonly();
  /** Other recent articles related to this one (rendered as news cards). */
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
   * The affected instruments the Analyst actually classified — the only ones carrying an
   * impact + confidence. Signals are generated per instrument, so an article touching five
   * tickers has a real call on the one its signal targets; the rest stay price-only chips
   * rather than being dressed up with a confidence nobody produced.
   */
  readonly classifiedImpacts = computed(() =>
    this.affectedInstrumentsSignal().filter((impact) => impact.impactClass !== undefined),
  );

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
      const detail = await this.newsRepository.getNewsDetail(id);
      if (detail === null) {
        this.notFoundSignal.set(true);
        return;
      }
      this.apply(detail);
      await this.resolveLinkedSignal(detail.news);
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
    } finally {
      this.loadingSignal.set(false);
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
   * the item and links the signal.
   *
   * The run is followed by a `refresh` read of the detail rather than by dropping the returned
   * item straight into state: a successful classification changes the *enrichment* too — the
   * instrument it targeted now carries an impact and a confidence — and that only comes back
   * from the detail endpoint. `refresh` is load-bearing either way: the signal we're looking
   * for was created seconds ago, so no cached response can contain it.
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
      await this.newsRepository.analyzeNewsItem(news.id);
      const detail = await this.newsRepository.getNewsDetail(news.id, { refresh: true });
      if (detail === null) {
        return;
      }
      this.apply(detail);
      this.linkedSignal.set(null);
      await this.resolveLinkedSignal(detail.news, { refresh: true });
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

  /** Push a freshly-fetched detail into view state, keeping the related-news page in range. */
  private apply(detail: NewsDetail): void {
    this.newsSignal.set(detail.news);
    this.affectedInstrumentsSignal.set(detail.affectedInstruments);
    this.relatedNewsSignal.set(detail.relatedNews);
    this.setRelatedNewsPage(this.relatedNewsPageSignal());
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
