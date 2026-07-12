export interface WatchlistCreateRequestDto {
  name: string;
}

export interface WatchlistRenameRequestDto {
  name: string;
}

export interface WatchlistItemAddRequestDto {
  symbol: string;
}

/** Body of `PATCH /api/v1/watchlists/reorder` — the full id list, first → last. */
export interface WatchlistReorderRequestDto {
  ordered_ids: string[];
}

export interface WatchlistItemDto {
  id: string;
  watchlist_id: string;
  symbol: string;
  added_at: string;
}
