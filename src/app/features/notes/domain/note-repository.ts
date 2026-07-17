import { Note } from './models/note.model';
import { NoteTargetRef } from './models/note-target.model';

/** Port for a user's persisted notes (issue #62). Implemented by `HttpNoteRepository`
 * against the backend `/api/v1/notes` router; abstract so it doubles as a DI token. */
export abstract class NoteRepository {
  abstract list(): Promise<Note[]>;
  abstract create(body: string, target?: NoteTargetRef): Promise<Note>;
  abstract update(id: string, body: string): Promise<Note>;
  abstract delete(id: string): Promise<void>;
}
