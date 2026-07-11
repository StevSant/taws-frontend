export interface WatchlistCreateRequestDto {
  name: string;
}

export interface WatchlistRenameRequestDto {
  name: string;
}

export interface WatchlistItemAddRequestDto {
  symbol: string;
}

export interface WatchlistItemDto {
  id: string;
  watchlist_id: string;
  symbol: string;
  added_at: string;
}
