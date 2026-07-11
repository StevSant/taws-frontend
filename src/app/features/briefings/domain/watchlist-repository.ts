import { Watchlist } from './models/watchlist.model';

/**
 * Domain port for the user's watchlists. An abstract class (not an
 * interface) so it can double as an Angular DI token — bind the concrete
 * adapter via `{ provide: WatchlistRepository, useClass: HttpWatchlistRepository }`.
 */
export abstract class WatchlistRepository {
  /** Returns every watchlist owned by the authenticated user. */
  abstract fetchWatchlists(): Promise<Watchlist[]>;
}
