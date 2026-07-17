import { NoteTarget } from './note-target.model';

/** A per-user free-text note (issue #62), surfaced on `/notes` and in the annotation
 * drawer. A note may optionally be *about* a briefing, scenario, or instrument via
 * `target`; `target: null` is a plain notepad entry. */
export interface Note {
  id: string;
  userId: string;
  body: string;
  target: NoteTarget | null;
  createdAt: string;
  updatedAt: string;
}
