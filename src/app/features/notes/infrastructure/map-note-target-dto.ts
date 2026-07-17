import { NoteTarget } from '../domain';
import { NoteTargetDto } from './note-target-dto';

/** Convert a snake_case `NoteTargetDto` into the camelCase domain `NoteTarget`. */
export function mapNoteTargetDto(dto: NoteTargetDto): NoteTarget {
  return {
    kind: dto.kind,
    label: dto.label,
    targetId: dto.target_id,
    watchlistId: dto.watchlist_id,
    available: dto.available,
  };
}
