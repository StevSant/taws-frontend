import { Injectable, computed, signal } from '@angular/core';
import { AuthTokenService, httpErrorDetail, TranslationService } from '../../../core';
import { Watchlist, WatchlistItem, WatchlistRepository } from '../domain';

/**
 * Root-provided single source of truth for the user's watchlists and their items (issue #16).
 * Lifting this out of the component-scoped `AddInstrumentStore` lets the radar home section, the
 * inline "Agregar instrumento" widget and the dedicated `/watchlists` page (issue #17) all read and
 * mutate the same state, so an add/remove/rename in one place shows up everywhere without a reload.
 *
 * Items are held **per watchlist**, not just for the active one: the radar's "Mis listas" strip
 * renders a card per list, and `Watchlist` carries no item count — so a card can't show even
 * "N instrumentos" without that list's items. `refresh()` therefore fans `listItems()` out across
 * every list, and `selectWatchlist()` reads the resulting cache instead of refetching, which also
 * makes switching lists on `/watchlists` instant.
 *
 * Auth-gated: the `/watchlists` API is authenticated, so the store is inert for anonymous users.
 * Loading failures are best-effort (they leave the state empty rather than blanking a page);
 * mutation failures surface on `error` — a translated HTTP status + server detail — and never throw
 * to the caller.
 *
 * It lives in `briefings/application` because the `WatchlistRepository` port and the watchlist
 * models already live in `briefings/domain`; radar consumes it cross-feature (radar already
 * depends on `briefings/domain`).
 */
@Injectable({ providedIn: 'root' })
export class WatchlistStore {
  private readonly watchlistsSignal = signal<Watchlist[]>([]);
  private readonly activeIdSignal = signal<string | null>(null);
  private readonly itemsByIdSignal = signal<ReadonlyMap<string, WatchlistItem[]>>(new Map());
  private readonly loadingSignal = signal(false);
  private readonly busySignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private loadPromise: Promise<void> | null = null;

  readonly watchlists = this.watchlistsSignal.asReadonly();
  readonly activeWatchlistId = this.activeIdSignal.asReadonly();
  /** Every loaded list's items, keyed by watchlist id — the radar strip's source. */
  readonly itemsByWatchlistId = this.itemsByIdSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly isBusy = this.busySignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /** Watchlist actions require an authenticated Supabase session. */
  readonly available = computed(() => this.authTokenService.currentToken() !== null);

  readonly activeWatchlist = computed<Watchlist | null>(
    () => this.watchlistsSignal().find((list) => list.id === this.activeIdSignal()) ?? null,
  );

  /** Items of the active watchlist, derived from the per-list cache. */
  readonly items = computed<WatchlistItem[]>(() => {
    const activeId = this.activeIdSignal();
    return activeId ? (this.itemsByIdSignal().get(activeId) ?? []) : [];
  });

  /** Uppercased symbols of the active watchlist, in insertion order — the home section's filter. */
  readonly symbols = computed(() => this.items().map((item) => item.symbol.toUpperCase()));

  /**
   * Deduped uppercase symbols across *every* list. The radar enriches these rather than only the
   * active list's, so a card for a non-active list still shows a real signal mix instead of
   * rendering entirely unclassified.
   */
  readonly allSymbols = computed(() => {
    const seen = new Set<string>();
    for (const items of this.itemsByIdSignal().values()) {
      for (const item of items) {
        seen.add(item.symbol.toUpperCase());
      }
    }
    return Array.from(seen);
  });

  readonly hasItems = computed(() => this.items().length > 0);

  constructor(
    private readonly watchlistRepository: WatchlistRepository,
    private readonly authTokenService: AuthTokenService,
    private readonly i18n: TranslationService,
  ) {}

  isFollowed(symbol: string): boolean {
    const needle = symbol.toUpperCase();
    return this.items().some((item) => item.symbol.toUpperCase() === needle);
  }

  /**
   * Loads watchlists + every watchlist's items once per session; a no-op when unauthenticated.
   *
   * Callers share the in-flight promise rather than a `loaded` boolean. The boolean version was
   * set *before* awaiting `refresh()`, so a second caller during that window saw "already loaded"
   * and returned while the fetch was still running — which is exactly what `RadarStore.init()` and
   * `enrichFeed()` do (init fires this un-awaited, enrichFeed then awaits it). Enrichment could
   * therefore compute its symbol set from an empty watchlist, leaving every pinned symbol that has
   * no recent news unenriched and its card reading "unclassified" until a later poll tick.
   */
  async ensureLoaded(): Promise<void> {
    if (!this.available()) {
      return;
    }
    this.loadPromise ??= this.refresh();
    await this.loadPromise;
  }

  /** Re-fetches the watchlists and the items of every one of them from the API. */
  async refresh(): Promise<void> {
    if (!this.available()) {
      return;
    }
    this.loadingSignal.set(true);
    try {
      const watchlists = await this.watchlistRepository.fetchWatchlists();
      this.watchlistsSignal.set(watchlists);
      const active = watchlists.find((list) => list.id === this.activeIdSignal()) ?? watchlists[0];
      if (!active) {
        this.activeIdSignal.set(null);
        this.itemsByIdSignal.set(new Map());
        return;
      }
      this.activeIdSignal.set(active.id);
      const entries = await Promise.all(
        watchlists.map(async (list) => [list.id, await this.safeListItems(list.id)] as const),
      );
      this.itemsByIdSignal.set(new Map(entries));
    } catch {
      // Best-effort — a failed load just leaves the tracked set empty, never blanks a page.
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /** Switches the active watchlist; items come from the cache when `refresh()` already has them. */
  async selectWatchlist(watchlistId: string): Promise<void> {
    this.activeIdSignal.set(watchlistId);
    this.errorSignal.set(null);
    if (this.itemsByIdSignal().has(watchlistId)) {
      return;
    }
    try {
      this.setItemsFor(watchlistId, await this.watchlistRepository.listItems(watchlistId));
    } catch (error: unknown) {
      this.setError(error);
      this.setItemsFor(watchlistId, []);
    }
  }

  async createWatchlist(name: string): Promise<Watchlist | null> {
    const trimmed = name.trim();
    if (!this.available() || !trimmed || this.busySignal()) {
      return null;
    }
    return this.run(async () => {
      const created = await this.watchlistRepository.createWatchlist(trimmed);
      this.watchlistsSignal.update((lists) => [...lists, created]);
      this.activeIdSignal.set(created.id);
      this.setItemsFor(created.id, []);
      return created;
    });
  }

  async renameWatchlist(watchlistId: string, name: string): Promise<void> {
    const trimmed = name.trim();
    if (!this.available() || !trimmed || this.busySignal()) {
      return;
    }
    await this.run(async () => {
      const updated = await this.watchlistRepository.renameWatchlist(watchlistId, trimmed);
      this.watchlistsSignal.update((lists) =>
        lists.map((list) => (list.id === updated.id ? updated : list)),
      );
    });
  }

  async deleteWatchlist(watchlistId: string): Promise<void> {
    if (!this.available() || this.busySignal()) {
      return;
    }
    await this.run(async () => {
      await this.watchlistRepository.deleteWatchlist(watchlistId);
      this.watchlistsSignal.update((lists) => lists.filter((list) => list.id !== watchlistId));
      this.itemsByIdSignal.update((current) => {
        const next = new Map(current);
        next.delete(watchlistId);
        return next;
      });
      if (this.activeIdSignal() === watchlistId) {
        const next = this.watchlistsSignal()[0] ?? null;
        this.activeIdSignal.set(next?.id ?? null);
        if (next && !this.itemsByIdSignal().has(next.id)) {
          this.setItemsFor(next.id, await this.safeListItems(next.id));
        }
      }
    });
  }

  /**
   * Adds a symbol to the active watchlist, lazily creating one named via
   * `radar.detail.watchlist.defaultName` ("Mi lista de seguimiento") when the user has none — not
   * after the instrument being added (issue #16). No-op when unauthenticated or already followed.
   */
  async addSymbol(symbol: string): Promise<void> {
    const normalized = symbol.trim().toUpperCase();
    if (!this.available() || !normalized || this.busySignal() || this.isFollowed(normalized)) {
      return;
    }
    await this.run(async () => {
      const watchlistId = await this.ensureActiveWatchlistId();
      const item = await this.watchlistRepository.addItem(watchlistId, normalized);
      this.updateItemsFor(watchlistId, (items) => [...items, item]);
    });
  }

  async removeItem(itemId: string): Promise<void> {
    const watchlistId = this.activeIdSignal();
    if (!this.available() || !watchlistId || this.busySignal()) {
      return;
    }
    await this.run(async () => {
      await this.watchlistRepository.removeItem(watchlistId, itemId);
      this.updateItemsFor(watchlistId, (items) => items.filter((item) => item.id !== itemId));
    });
  }

  async removeSymbol(symbol: string): Promise<void> {
    const needle = symbol.toUpperCase();
    const item = this.items().find((candidate) => candidate.symbol.toUpperCase() === needle);
    if (item) {
      await this.removeItem(item.id);
    }
  }

  /** One list's items failing must not blank the others, so `refresh()`'s fan-out never rejects. */
  private async safeListItems(watchlistId: string): Promise<WatchlistItem[]> {
    try {
      return await this.watchlistRepository.listItems(watchlistId);
    } catch {
      return [];
    }
  }

  private setItemsFor(watchlistId: string, items: WatchlistItem[]): void {
    this.itemsByIdSignal.update((current) => new Map(current).set(watchlistId, items));
  }

  private updateItemsFor(
    watchlistId: string,
    updater: (items: WatchlistItem[]) => WatchlistItem[],
  ): void {
    this.itemsByIdSignal.update((current) => {
      const next = new Map(current);
      next.set(watchlistId, updater(current.get(watchlistId) ?? []));
      return next;
    });
  }

  private async ensureActiveWatchlistId(): Promise<string> {
    const current = this.activeIdSignal();
    if (current) {
      return current;
    }
    const existing = this.watchlistsSignal()[0];
    if (existing) {
      this.activeIdSignal.set(existing.id);
      return existing.id;
    }
    const created = await this.watchlistRepository.createWatchlist(
      this.i18n.t('radar.detail.watchlist.defaultName'),
    );
    this.watchlistsSignal.update((lists) => [...lists, created]);
    this.activeIdSignal.set(created.id);
    this.setItemsFor(created.id, []);
    return created.id;
  }

  /** Runs a mutation with shared busy/error handling; returns the action's result or null on failure. */
  private async run<T>(action: () => Promise<T>): Promise<T | null> {
    this.busySignal.set(true);
    this.errorSignal.set(null);
    try {
      return await action();
    } catch (error: unknown) {
      this.setError(error);
      return null;
    } finally {
      this.busySignal.set(false);
    }
  }

  private setError(error: unknown): void {
    this.errorSignal.set(
      `${this.i18n.t('radar.detail.watchlist.error')} ${httpErrorDetail(error, this.i18n)}`,
    );
  }
}
