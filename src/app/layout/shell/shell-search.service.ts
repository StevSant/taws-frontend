import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslationKey, TranslationService } from '../../core';
import { RadarStore } from '../../features/radar/application';
import { AssetClass, Instrument, InstrumentRepository } from '../../features/radar/domain';
import { ShellSearchResult, filterShellSearch, shellSearchResultKey } from './filter-shell-search';

const ASSET_CLASS_LABEL_KEYS: Record<AssetClass, TranslationKey> = {
  stock: 'radar.assetClass.stock',
  crypto: 'radar.assetClass.crypto',
  credit: 'radar.assetClass.credit',
  commodity: 'radar.assetClass.commodity',
  forex: 'radar.assetClass.forex',
};

@Injectable({ providedIn: 'root' })
export class ShellSearchService {
  private readonly instrumentRepository = inject(InstrumentRepository);
  private readonly radarStore = inject(RadarStore);
  private readonly router = inject(Router);
  private readonly i18n = inject(TranslationService);

  private readonly querySignal = signal('');
  private readonly instrumentsSignal = signal<Instrument[]>([]);
  private readonly isLoadingSignal = signal(false);
  private readonly isOpenSignal = signal(false);
  private readonly activeIndexSignal = signal(0);
  private readonly chatDraftIntentSignal = signal<string | null>(null);
  private instrumentsLoadStarted = false;

  readonly query = this.querySignal.asReadonly();
  readonly isOpen = this.isOpenSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly activeIndex = this.activeIndexSignal.asReadonly();

  readonly results = computed((): ShellSearchResult[] => {
    const query = this.querySignal().trim();
    if (query.length === 0) {
      return [];
    }

    const assetClassLabels = Object.fromEntries(
      (Object.keys(ASSET_CLASS_LABEL_KEYS) as AssetClass[]).map((assetClass) => [
        assetClass,
        this.i18n.t(ASSET_CLASS_LABEL_KEYS[assetClass]),
      ]),
    ) as Record<AssetClass, string>;

    return filterShellSearch(query, this.instrumentsSignal(), assetClassLabels);
  });

  readonly topicFallback = computed((): ShellSearchResult | null => {
    const query = this.querySignal().trim();
    if (query.length < 2 || this.results().length > 0) {
      return null;
    }
    return { kind: 'topic', query };
  });

  readonly visibleResults = computed((): ShellSearchResult[] => {
    const matches = this.results();
    const fallback = this.topicFallback();
    return fallback ? [...matches, fallback] : matches;
  });

  setQuery(value: string): void {
    this.querySignal.set(value);
    this.activeIndexSignal.set(0);
    this.isOpenSignal.set(value.trim().length > 0);
  }

  open(): void {
    if (this.querySignal().trim().length > 0) {
      this.isOpenSignal.set(true);
    }
  }

  close(): void {
    this.isOpenSignal.set(false);
    this.activeIndexSignal.set(0);
  }

  clear(): void {
    this.querySignal.set('');
    this.close();
  }

  moveActive(delta: number): void {
    const total = this.visibleResults().length;
    if (total === 0) {
      return;
    }
    this.activeIndexSignal.update((index) => (index + delta + total) % total);
  }

  async ensureInstrumentsLoaded(): Promise<void> {
    if (this.instrumentsLoadStarted) {
      return;
    }
    this.instrumentsLoadStarted = true;
    this.isLoadingSignal.set(true);
    try {
      const instruments = await this.instrumentRepository.fetchInstruments();
      this.instrumentsSignal.set(instruments);
    } catch {
      this.instrumentsSignal.set([]);
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  async submitActive(): Promise<void> {
    const results = this.visibleResults();
    const index = this.activeIndexSignal();
    const selected = results[index] ?? results[0];
    if (!selected) {
      await this.submitTopic(this.querySignal());
      return;
    }
    await this.select(selected);
  }

  async select(result: ShellSearchResult): Promise<void> {
    switch (result.kind) {
      case 'instrument':
        await this.goToInstrument(result.symbol);
        break;
      case 'assetClass':
        await this.goToAssetClass(result.assetClass);
        break;
      case 'topic':
        await this.goToChatWithQuery(result.query);
        break;
    }
    this.clear();
  }

  consumeChatDraftIntent(): string | null {
    const draft = this.chatDraftIntentSignal();
    this.chatDraftIntentSignal.set(null);
    return draft;
  }

  /** Prefill the chat composer and navigate to `/chat` (used by Agents catalog). */
  async openChatWithDraft(query: string): Promise<void> {
    await this.goToChatWithQuery(query.trim());
  }

  resultKey(result: ShellSearchResult): string {
    return shellSearchResultKey(result);
  }

  assetClassLabel(assetClass: AssetClass): string {
    return this.i18n.t(ASSET_CLASS_LABEL_KEYS[assetClass]);
  }

  private async submitTopic(query: string): Promise<void> {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      return;
    }
    await this.goToChatWithQuery(trimmed);
    this.clear();
  }

  private async goToInstrument(symbol: string): Promise<void> {
    // Selecting an instrument opens its per-asset detail page (issue #43) —
    // the full price chart, quant stats, signal analysis, and related news for
    // that one symbol — rather than just filtering the radar feed.
    await this.router.navigate(['/radar', symbol]);
  }

  private async goToAssetClass(assetClass: AssetClass): Promise<void> {
    await this.router.navigate(['/radar']);
    await this.radarStore.setAssetClass(assetClass);
  }

  private async goToChatWithQuery(query: string): Promise<void> {
    this.chatDraftIntentSignal.set(query);
    await this.router.navigate(['/chat']);
  }
}
