import { Watchlist } from './models/watchlist.model';
import { WatchlistItem } from './models/watchlist-item.model';

export abstract class WatchlistRepository {
  abstract fetchWatchlists(): Promise<Watchlist[]>;
  abstract createWatchlist(name: string): Promise<Watchlist>;
  abstract renameWatchlist(id: string, name: string): Promise<Watchlist>;
  abstract deleteWatchlist(id: string): Promise<void>;
  /** Persists a new watchlist order; `orderedIds` is the full list, first → last. */
  abstract reorder(orderedIds: string[]): Promise<void>;
  abstract listItems(watchlistId: string): Promise<WatchlistItem[]>;
  abstract addItem(watchlistId: string, symbol: string): Promise<WatchlistItem>;
  abstract removeItem(watchlistId: string, itemId: string): Promise<void>;
}
