import { NoteTargetKind } from './note-target-kind.model';

/**
 * The object a note is about, as recorded when the note was written.
 *
 * `available` is sent explicitly by the API — never infer it. `kind` and `label` survive
 * the target's deletion, so a note can still say what it was about after the thing itself
 * is gone; `targetId` is null in exactly that case.
 *
 * `label` is a snapshot: it says what the object was called when the note was written,
 * which is what its author saw. It is deliberately not refreshed on rename.
 */
export interface NoteTarget {
  kind: NoteTargetKind;
  label: string;
  targetId: string | null;
  watchlistId: string | null;
  available: boolean;
}

/** A reference to a target, as sent when creating a note. Never carries display text. */
export interface NoteTargetRef {
  kind: NoteTargetKind;
  targetId: string;
}
