/** A per-user free-text note (issue #62). Surfaced by the shared Guía/Notas panel on both
 * the Briefings and Scenario Lab pages; not tied to any single briefing or scenario. */
export interface Note {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}
