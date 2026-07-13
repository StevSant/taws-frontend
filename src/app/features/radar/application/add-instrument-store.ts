import { Injectable, computed, inject, signal } from '@angular/core';
import { httpErrorDetail, TranslationService } from '../../../core';
import { WatchlistStore } from '../../briefings/application';
import { WatchlistItem } from '../../briefings/domain';
import { CoinCandidate, Instrument, InstrumentRepository } from '../domain';

/** Max autocomplete results shown at once. */
const MAX_RESULTS = 8;

/**
 * Component-scoped store backing the "Agregar instrumento" picker (issue #60). Owns the widget's
 * local UI state (search query, open/closed, per-symbol busy flag), filters the curated instrument
 * universe (`GET /api/v1/instruments`), and — Slice 4 — searches CoinGecko
 * (`GET /api/v1/instruments/search`) and registers a new coin (`POST /api/v1/instruments`).
 *
 * The tracked set itself lives in the root-provided `WatchlistStore` (issue #16), so an add/remove —
 * or a register, which adds the coin server-side — is reflected immediately across the radar home
 * and the `/watchlists` page without a reload. Auth-gated and inert for anonymous users; a duplicate
 * add/register is a no-op; errors surface (never thrown) on `error`.
 */
@Injectable()
export class AddInstrumentStore {
  private readonly instrumentRepository = inject(InstrumentRepository);
  private readonly watchlistStore = inject(WatchlistStore);
  private readonly i18n = inject(TranslationService);

  private readonly instrumentsSignal = signal<Instrument[]>([]);
  private readonly querySignal = signal('');
  private readonly busySymbolSignal = signal<string | null>(null);
  private readonly searchResultsSignal = signal<CoinCandidate[]>([]);
  private readonly searchErrorSignal = signal<string | null>(null);

  readonly query = this.querySignal.asReadonly();
  readonly busySymbol = this.busySymbolSignal.asReadonly();
  /** CoinGecko candidates from the most recent `search()` call, for the crypto picker (Slice 4). */
  readonly searchResults = this.searchResultsSignal.asReadonly();
  private readonly openSignal = signal(false);
  readonly isOpen = this.openSignal.asReadonly();

  /** Tracked items come straight from the shared store so the widget stays in sync. */
  readonly followedItems = this.watchlistStore.items;
  readonly available = this.watchlistStore.available;

  /** Combines the shared watchlist error with this widget's own search/register error. */
  readonly error = computed(() => this.searchErrorSignal() ?? this.watchlistStore.error());

  private readonly followedSymbols = computed(
    () => new Set(this.watchlistStore.items().map((item) => item.symbol.toUpperCase())),
  );

  /** Instruments matching the current query (symbol or name), capped, with follow state. */
  readonly results = computed(() => {
    const needle = this.querySignal().trim().toLowerCase();
    const followed = this.followedSymbols();
    return this.instrumentsSignal()
      .filter(
        (instrument) =>
          needle === '' ||
          instrument.symbol.toLowerCase().includes(needle) ||
          instrument.name.toLowerCase().includes(needle),
      )
      .slice(0, MAX_RESULTS)
      .map((instrument) => ({
        instrument,
        followed: followed.has(instrument.symbol.toUpperCase()),
      }));
  });

  isFollowed(symbol: string): boolean {
    return this.followedSymbols().has(symbol.toUpperCase());
  }

  async init(): Promise<void> {
    await Promise.all([this.loadInstruments(), this.watchlistStore.ensureLoaded()]);
  }

  toggleOpen(): void {
    this.openSignal.update((open) => !open);
  }

  setQuery(value: string): void {
    this.querySignal.set(value);
  }

  /** Searches CoinGecko for coins matching `query`; fails soft to an empty list + `error` signal. */
  async search(query: string): Promise<void> {
    try {
      this.searchResultsSignal.set(await this.instrumentRepository.searchCoins(query));
      this.searchErrorSignal.set(null);
    } catch (error) {
      this.searchResultsSignal.set([]);
      this.searchErrorSignal.set(httpErrorDetail(error, this.i18n));
    }
  }

  /**
   * Registers a searched coin (`POST /api/v1/instruments`) — persisting it to the global catalog
   * and adding it to the caller's watchlist server-side — then refreshes the shared watchlist so the
   * coin appears everywhere. Already-followed symbols are a no-op; failures surface on `error`.
   */
  async registerAndFollow(candidate: CoinCandidate): Promise<void> {
    if (this.watchlistStore.isFollowed(candidate.symbol)) {
      return;
    }
    if (this.busySymbolSignal()) {
      return;
    }
    this.busySymbolSignal.set(candidate.symbol.toUpperCase());
    try {
      await this.instrumentRepository.registerInstrument(candidate);
      await this.watchlistStore.refresh();
      this.searchErrorSignal.set(null);
    } catch (error) {
      this.searchErrorSignal.set(httpErrorDetail(error, this.i18n));
    } finally {
      this.busySymbolSignal.set(null);
    }
  }

  /** Adds an instrument to the tracked watchlist via the shared store (auto-creates one if needed). */
  async add(symbol: string): Promise<void> {
    if (this.busySymbolSignal()) {
      return;
    }
    const normalized = symbol.toUpperCase();
    this.busySymbolSignal.set(normalized);
    try {
      await this.watchlistStore.addSymbol(normalized);
    } finally {
      this.busySymbolSignal.set(null);
    }
  }

  async remove(item: WatchlistItem): Promise<void> {
    if (this.busySymbolSignal()) {
      return;
    }
    this.busySymbolSignal.set(item.symbol.toUpperCase());
    try {
      await this.watchlistStore.removeItem(item.id);
    } finally {
      this.busySymbolSignal.set(null);
    }
  }

  private async loadInstruments(): Promise<void> {
    try {
      this.instrumentsSignal.set(await this.instrumentRepository.fetchInstruments());
    } catch {
      this.instrumentsSignal.set([]);
    }
  }
}
