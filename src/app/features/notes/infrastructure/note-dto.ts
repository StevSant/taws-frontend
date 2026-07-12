/** Wire shape of a note as returned by `/api/v1/notes` (snake_case). */
export interface NoteDto {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

/** Request body for creating/updating a note. */
export interface NoteBodyRequestDto {
  body: string;
}
