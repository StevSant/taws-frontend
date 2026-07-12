import { Injectable, computed, signal } from '@angular/core';
import { AuthTokenService } from '../../../core';
import { WatchlistItem, WatchlistRepository } from '../../briefings/domain';
import { Instrument, InstrumentRepository } from '../domain';

/** Max autocomplete results shown at once. */
const MAX_RESULTS = 8;

/**
 * Component-scoped store backing the "Agregar instrumento" picker (issue #60). Replaces the
 * old dead-end link to /briefings: it searches the instrument universe
 * (`GET /api/v1/instruments`) and, on selection, adds the instrument to the user's watchlist
 * (optimistic + persisted via `WatchlistRepository`), so the tracked set updates without a
 * page reload and survives a refresh.
 *
 * Auth-gated (the `/watchlists` API is authenticated): inert for anonymous users. Adding a
 * duplicate is a no-op (the symbol is already followed). Errors surface on `error` and never
 * throw to the page.
 */
@Injectable()
export class AddInstrumentStore {
  private readonly instrumentsSignal = signal<Instrument[]>([]);
  private readonly querySignal = signal('');
  private readonly followedItemsSignal = signal<WatchlistItem[]>([]);
  private readonly watchlistIdSignal = signal<string | null>(null);
  private readonly openSignal = signal(false);
  private readonly busySymbolSignal = signal<string | null>(null);
  private readonly errorSignal = signal<string | null>(null);

  readonly query = this.querySignal.asReadonly();
  readonly isOpen = this.openSignal.asReadonly();
  readonly busySymbol = this.busySymbolSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly followedItems = this.followedItemsSignal.asReadonly();

  /** Watchlist actions require an authenticated Supabase session (see class doc). */
  readonly available = computed(() => this.authTokenService.currentToken() !== null);

  private readonly followedSymbols = computed(
    () => new Set(this.followedItemsSignal().map((item) => item.symbol.toUpperCase())),
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

  constructor(
    private readonly instrumentRepository: InstrumentRepository,
    private readonly watchlistRepository: WatchlistRepository,
    private readonly authTokenService: AuthTokenService,
  ) {}

  isFollowed(symbol: string): boolean {
    return this.followedSymbols().has(symbol.toUpperCase());
  }

  async init(): Promise<void> {
    await Promise.all([this.loadInstruments(), this.loadWatchlist()]);
  }

  toggleOpen(): void {
    this.openSignal.update((open) => !open);
  }

  setQuery(value: string): void {
    this.querySignal.set(value);
  }

  /**
   * Adds an instrument to the tracked watchlist. No-op when unauthenticated or already
   * followed (graceful duplicate handling). Optimistic then re-synced from the API.
   */
  async add(symbol: string, fallbackName: string): Promise<void> {
    if (!this.available() || this.busySymbolSignal()) {
      return;
    }
    const normalized = symbol.toUpperCase();
    if (this.isFollowed(normalized)) {
      return;
    }
    this.busySymbolSignal.set(normalized);
    this.errorSignal.set(null);
    try {
      const watchlistId = await this.ensureWatchlistId(fallbackName);
      await this.watchlistRepository.addItem(watchlistId, normalized);
      this.followedItemsSignal.set(await this.watchlistRepository.listItems(watchlistId));
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
    } finally {
      this.busySymbolSignal.set(null);
    }
  }

  async remove(item: WatchlistItem): Promise<void> {
    if (!this.available() || this.busySymbolSignal()) {
      return;
    }
    const watchlistId = this.watchlistIdSignal();
    if (!watchlistId) {
      return;
    }
    this.busySymbolSignal.set(item.symbol.toUpperCase());
    this.errorSignal.set(null);
    try {
      await this.watchlistRepository.removeItem(watchlistId, item.id);
      this.followedItemsSignal.set(await this.watchlistRepository.listItems(watchlistId));
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
    } finally {
      this.busySymbolSignal.set(null);
    }
  }

  private async ensureWatchlistId(fallbackName: string): Promise<string> {
    const current = this.watchlistIdSignal();
    if (current) {
      return current;
    }
    const watchlists = await this.watchlistRepository.fetchWatchlists();
    const existing = watchlists[0];
    if (existing) {
      this.watchlistIdSignal.set(existing.id);
      return existing.id;
    }
    const created = await this.watchlistRepository.createWatchlist(fallbackName);
    this.watchlistIdSignal.set(created.id);
    return created.id;
  }

  private async loadInstruments(): Promise<void> {
    try {
      this.instrumentsSignal.set(await this.instrumentRepository.fetchInstruments());
    } catch {
      this.instrumentsSignal.set([]);
    }
  }

  private async loadWatchlist(): Promise<void> {
    if (!this.available()) {
      return;
    }
    try {
      const watchlists = await this.watchlistRepository.fetchWatchlists();
      const first = watchlists[0];
      if (!first) {
        return;
      }
      this.watchlistIdSignal.set(first.id);
      this.followedItemsSignal.set(await this.watchlistRepository.listItems(first.id));
    } catch {
      // Best-effort — a failure just leaves the tracked chips empty.
    }
  }

  private toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error while updating the watchlist';
  }
}
