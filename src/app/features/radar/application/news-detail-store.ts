import { Injectable, computed, signal } from '@angular/core';
import {
  MarketStats,
  NewsItem,
  NewsRepository,
  QuantRepository,
  Signal,
  SignalRepository,
} from '../domain';

/** How many hours back to look for related news on the detail page. */
const RELATED_NEWS_WINDOW_HOURS = 168;
/** Cap on related-news cards shown, so a busy instrument doesn't flood the page. */
const MAX_RELATED_NEWS = 6;
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
  private readonly loadingSignal = signal(false);
  private readonly notFoundSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly generatingSignal = signal(false);

  readonly news = this.newsSignal.asReadonly();
  readonly signal = this.linkedSignal.asReadonly();
  /** Live price + %change for each instrument the article affects (chips link to `radar/:symbol`). */
  readonly affectedInstruments = this.affectedInstrumentsSignal.asReadonly();
  /** Other recent articles touching the same primary instrument (rendered as news cards). */
  readonly relatedNews = this.relatedNewsSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly isNotFound = this.notFoundSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly isGenerating = this.generatingSignal.asReadonly();

  /** Primary instrument the article links to — the target of the "Analizar" action. */
  readonly primarySymbol = computed(() => this.newsSignal()?.relatedSymbols[0] ?? null);

  constructor(
    private readonly newsRepository: NewsRepository,
    private readonly signalRepository: SignalRepository,
    private readonly quantRepository: QuantRepository,
  ) {}

  async load(id: string): Promise<void> {
    this.loadingSignal.set(true);
    this.notFoundSignal.set(false);
    this.errorSignal.set(null);
    this.newsSignal.set(null);
    this.linkedSignal.set(null);
    this.affectedInstrumentsSignal.set([]);
    this.relatedNewsSignal.set([]);
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
      this.relatedNewsSignal.set(
        items.filter((item) => item.id !== news.id).slice(0, MAX_RELATED_NEWS),
      );
    } catch {
      this.relatedNewsSignal.set([]);
    }
  }

  /** Runs the Analyst pipeline for the linked instrument and shows the fresh signal. */
  async generate(): Promise<void> {
    const symbol = this.primarySymbol();
    if (!symbol || this.generatingSignal()) {
      return;
    }
    this.generatingSignal.set(true);
    this.errorSignal.set(null);
    try {
      const signal = await this.signalRepository.generateSignal(symbol);
      this.linkedSignal.set(signal);
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
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
  private async resolveLinkedSignal(news: NewsItem): Promise<void> {
    if (!news.signalId) {
      return;
    }
    for (const symbol of news.relatedSymbols) {
      try {
        const signals = await this.signalRepository.fetchSignals(symbol);
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
