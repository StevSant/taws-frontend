/** Wire shape of `WatchlistResponse` as returned by `GET /api/v1/watchlists`. */
export interface WatchlistDto {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}
