import { Watchlist } from '../domain';
import { WatchlistDto } from './watchlist-dto';

/** Maps a `WatchlistDto` (snake_case wire shape) to the domain `Watchlist`. */
export function mapWatchlistDto(dto: WatchlistDto): Watchlist {
  return {
    id: dto.id,
    userId: dto.user_id,
    name: dto.name,
    createdAt: dto.created_at,
  };
}
