import { Note } from '../domain';
import { mapNoteTargetDto } from './map-note-target-dto';
import { NoteDto } from './note-dto';

/** Convert a snake_case `NoteDto` from the API into the camelCase domain `Note`. */
export function mapNoteDto(dto: NoteDto): Note {
  return {
    id: dto.id,
    userId: dto.user_id,
    body: dto.body,
    target: dto.target ? mapNoteTargetDto(dto.target) : null,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}
