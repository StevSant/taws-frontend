import { NoteTarget } from '../domain';

/** A router link to a note's target, in the shape `routerLink` bindings want. */
export interface NoteTargetLink {
  commands: unknown[];
  queryParams: Record<string, string>;
  fragment: string | undefined;
}

/**
 * Build the link back to what a note is about, or null if there is nowhere to go.
 *
 * Briefings are the awkward one: there is no `/briefings/:id` route, and the list renders
 * only the *active* watchlist's reports. So the link pre-selects the right watchlist and
 * anchors the card, which `briefings-page` already labels `briefing-card-<id>`.
 */
export function noteTargetLink(target: NoteTarget): NoteTargetLink | null {
  if (!target.available || target.targetId === null) {
    return null;
  }

  switch (target.kind) {
    case 'briefing':
      return {
        commands: ['/briefings'],
        queryParams: target.watchlistId ? { watchlist: target.watchlistId } : {},
        fragment: `briefing-card-${target.targetId}`,
      };
    case 'scenario':
      return { commands: ['/scenarios', target.targetId], queryParams: {}, fragment: undefined };
    case 'instrument':
      return { commands: ['/radar', target.targetId], queryParams: {}, fragment: undefined };
  }
}
