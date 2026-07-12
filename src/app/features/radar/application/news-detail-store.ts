import { Injectable, computed, signal } from '@angular/core';
import { NewsItem, NewsRepository, Signal, SignalRepository } from '../domain';

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
  private readonly loadingSignal = signal(false);
  private readonly notFoundSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly generatingSignal = signal(false);

  readonly news = this.newsSignal.asReadonly();
  readonly signal = this.linkedSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly isNotFound = this.notFoundSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly isGenerating = this.generatingSignal.asReadonly();

  /** Primary instrument the article links to — the target of the "Analizar" action. */
  readonly primarySymbol = computed(() => this.newsSignal()?.relatedSymbols[0] ?? null);

  constructor(
    private readonly newsRepository: NewsRepository,
    private readonly signalRepository: SignalRepository,
  ) {}

  async load(id: string): Promise<void> {
    this.loadingSignal.set(true);
    this.notFoundSignal.set(false);
    this.errorSignal.set(null);
    this.newsSignal.set(null);
    this.linkedSignal.set(null);
    try {
      const news = await this.newsRepository.getNewsById(id);
      if (news === null) {
        this.notFoundSignal.set(true);
        return;
      }
      this.newsSignal.set(news);
      await this.resolveLinkedSignal(news);
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
    } finally {
      this.loadingSignal.set(false);
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
