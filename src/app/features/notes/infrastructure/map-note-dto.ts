import { Note } from '../domain';
import { NoteDto } from './note-dto';

/** Convert a snake_case `NoteDto` from the API into the camelCase domain `Note`. */
export function mapNoteDto(dto: NoteDto): Note {
  return {
    id: dto.id,
    userId: dto.user_id,
    body: dto.body,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}
