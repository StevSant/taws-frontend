/** A per-user free-text note (issue #62). Surfaced on the dedicated Notes page (`/notes`);
 * one global list per user, not tied to any single briefing or scenario. */
export interface Note {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}
