import { WatchlistItem } from '../domain';
import { WatchlistItemDto } from './watchlist-item-dto';

export function mapWatchlistItemDto(dto: WatchlistItemDto): WatchlistItem {
  return {
    id: dto.id,
    watchlistId: dto.watchlist_id,
    symbol: dto.symbol,
    addedAt: dto.added_at,
  };
}
