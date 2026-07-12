import { Injectable, computed, inject, signal } from '@angular/core';
import { WatchlistStore } from '../../briefings/application';
import { WatchlistItem } from '../../briefings/domain';
import { Instrument, InstrumentRepository } from '../domain';

/** Max autocomplete results shown at once. */
const MAX_RESULTS = 8;

/**
 * Component-scoped store backing the "Agregar instrumento" picker (issue #60). Owns only the
 * widget's local UI state (search query, open/closed, per-symbol busy flag) and searches the
 * instrument universe (`GET /api/v1/instruments`).
 *
 * The tracked set itself lives in the root-provided `WatchlistStore` (issue #16), so an add/remove
 * here is reflected immediately on the radar home instruments section and the dedicated
 * `/watchlists` page — and vice-versa — without a reload. Auth-gated and inert for anonymous users;
 * adding a duplicate is a no-op; errors surface (translated) on `error` and never throw to the page.
 */
@Injectable()
export class AddInstrumentStore {
  private readonly instrumentRepository = inject(InstrumentRepository);
  private readonly watchlistStore = inject(WatchlistStore);

  private readonly instrumentsSignal = signal<Instrument[]>([]);
  private readonly querySignal = signal('');
  private readonly busySymbolSignal = signal<string | null>(null);

  readonly query = this.querySignal.asReadonly();
  readonly busySymbol = this.busySymbolSignal.asReadonly();
  private readonly openSignal = signal(false);
  readonly isOpen = this.openSignal.asReadonly();

  /** Tracked items + error come straight from the shared store so the widget stays in sync. */
  readonly followedItems = this.watchlistStore.items;
  readonly error = this.watchlistStore.error;
  readonly available = this.watchlistStore.available;

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
