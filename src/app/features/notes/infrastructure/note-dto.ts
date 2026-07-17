import { NoteTargetKind } from '../domain';
import { NoteTargetDto } from './note-target-dto';

/** Wire shape of a note as returned by `/api/v1/notes` (snake_case). */
export interface NoteDto {
  id: string;
  user_id: string;
  body: string;
  target?: NoteTargetDto | null;
  created_at: string;
  updated_at: string;
}

/** Request body for updating a note. Body-only: re-targeting is not supported. */
export interface NoteBodyRequestDto {
  body: string;
}

/** Request body for creating a note. Carries a target *reference* — never a label,
 * which the server resolves so it cannot be spoofed. */
export interface NoteCreateRequestDto {
  body: string;
  target_kind?: NoteTargetKind;
  target_id?: string;
}
