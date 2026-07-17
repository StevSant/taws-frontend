import { NoteTargetKind } from '../domain';

/** Wire shape of a note's target as returned by `/api/v1/notes` (snake_case). */
export interface NoteTargetDto {
  kind: NoteTargetKind;
  label: string;
  target_id: string | null;
  watchlist_id: string | null;
  available: boolean;
}
