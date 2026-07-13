import { Briefing } from '../domain';
import { BriefingDto } from './briefing-dto';
import { mapLinkedSignalDto } from './map-linked-signal-dto';

/** Maps a `BriefingDto` (snake_case wire shape) to the domain `Briefing`. */
export function mapBriefingDto(dto: BriefingDto): Briefing {
  return {
    id: dto.id,
    watchlistId: dto.watchlist_id,
    summary: dto.summary,
    disclaimer: dto.disclaimer,
    linkedSignalIds: dto.linked_signal_ids,
    linkedSignals: (dto.linked_signals ?? []).map(mapLinkedSignalDto),
    createdAt: dto.created_at,
  };
}
