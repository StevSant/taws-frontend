import { Injectable, computed, signal } from '@angular/core';
import { AuthTokenService, httpErrorDetail, TranslationService } from '../../../core';
import { Watchlist, WatchlistItem, WatchlistRepository } from '../domain';

/**
 * Root-provided single source of truth for the user's watchlists and the items of the **active**
 * watchlist (issue #16). Lifting this out of the component-scoped `AddInstrumentStore` lets the
 * radar home section, the inline "Agregar instrumento" widget and the dedicated `/watchlists`
 * page (issue #17) all read and mutate the same state, so an add/remove/rename in one place shows
 * up everywhere without a reload.
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
  private readonly itemsSignal = signal<WatchlistItem[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly busySignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private loaded = false;

  readonly watchlists = this.watchlistsSignal.asReadonly();
  readonly activeWatchlistId = this.activeIdSignal.asReadonly();
  readonly items = this.itemsSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();
  readonly isBusy = this.busySignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /** Watchlist actions require an authenticated Supabase session. */
  readonly available = computed(() => this.authTokenService.currentToken() !== null);

  readonly activeWatchlist = computed<Watchlist | null>(
    () => this.watchlistsSignal().find((list) => list.id === this.activeIdSignal()) ?? null,
  );

  /** Uppercased symbols of the active watchlist, in insertion order — the home section's filter. */
  readonly symbols = computed(() => this.itemsSignal().map((item) => item.symbol.toUpperCase()));

  readonly hasItems = computed(() => this.itemsSignal().length > 0);

  constructor(
    private readonly watchlistRepository: WatchlistRepository,
    private readonly authTokenService: AuthTokenService,
    private readonly i18n: TranslationService,
  ) {}

  isFollowed(symbol: string): boolean {
    const needle = symbol.toUpperCase();
    return this.itemsSignal().some((item) => item.symbol.toUpperCase() === needle);
  }

  /** Loads watchlists + the first watchlist's items once per session; a no-op when unauthenticated. */
  async ensureLoaded(): Promise<void> {
    if (this.loaded || !this.available()) {
      return;
    }
    this.loaded = true;
    await this.refresh();
  }

  /** Re-fetches watchlists and the active (or first) watchlist's items from the API. */
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
        this.itemsSignal.set([]);
        return;
      }
      this.activeIdSignal.set(active.id);
      this.itemsSignal.set(await this.watchlistRepository.listItems(active.id));
    } catch {
      // Best-effort — a failed load just leaves the tracked set empty, never blanks a page.
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /** Switches which watchlist is active (used by the dedicated page) and loads its items. */
  async selectWatchlist(watchlistId: string): Promise<void> {
    this.activeIdSignal.set(watchlistId);
    this.errorSignal.set(null);
    try {
      this.itemsSignal.set(await this.watchlistRepository.listItems(watchlistId));
    } catch (error: unknown) {
      this.setError(error);
      this.itemsSignal.set([]);
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
      this.itemsSignal.set([]);
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
      if (this.activeIdSignal() === watchlistId) {
        const next = this.watchlistsSignal()[0] ?? null;
        this.activeIdSignal.set(next?.id ?? null);
        this.itemsSignal.set(next ? await this.watchlistRepository.listItems(next.id) : []);
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
      this.itemsSignal.update((items) => [...items, item]);
    });
  }

  async removeItem(itemId: string): Promise<void> {
    const watchlistId = this.activeIdSignal();
    if (!this.available() || !watchlistId || this.busySignal()) {
      return;
    }
    await this.run(async () => {
      await this.watchlistRepository.removeItem(watchlistId, itemId);
      this.itemsSignal.update((items) => items.filter((item) => item.id !== itemId));
    });
  }

  async removeSymbol(symbol: string): Promise<void> {
    const needle = symbol.toUpperCase();
    const item = this.itemsSignal().find((candidate) => candidate.symbol.toUpperCase() === needle);
    if (item) {
      await this.removeItem(item.id);
    }
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
