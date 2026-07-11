/**
 * A named collection of instruments a user tracks. Mirrors `WatchlistResponse`
 * (`GET /api/v1/watchlists`) — watchlists are always owned by the requesting
 * user (the backend scopes `list_for_user` to the authenticated user's id).
 */
export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  /** ISO-8601 timestamp, as returned by the API. */
  createdAt: string;
}
