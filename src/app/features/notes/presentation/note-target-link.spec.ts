import { describe, expect, it } from 'vitest';
import { NoteTarget } from '../domain';
import { noteTargetLink } from './note-target-link';

function target(overrides: Partial<NoteTarget>): NoteTarget {
  return {
    kind: 'briefing',
    label: 'Some label',
    targetId: 'id-1',
    watchlistId: null,
    available: true,
    ...overrides,
  };
}

describe('noteTargetLink', () => {
  it('sends a briefing to the reports list, pre-selecting its watchlist and anchoring the card', () => {
    // /briefings renders only the ACTIVE watchlist's reports and has no :id route, so a
    // bare link would silently land on a list that does not contain the report.
    expect(
      noteTargetLink(target({ kind: 'briefing', targetId: 'briefing-1', watchlistId: 'wl-7' })),
    ).toEqual({
      commands: ['/briefings'],
      queryParams: { watchlist: 'wl-7' },
      fragment: 'briefing-card-briefing-1',
    });
  });

  it('omits the watchlist query param when a briefing has none', () => {
    expect(
      noteTargetLink(target({ kind: 'briefing', targetId: 'briefing-1', watchlistId: null })),
    ).toEqual({
      commands: ['/briefings'],
      queryParams: {},
      fragment: 'briefing-card-briefing-1',
    });
  });

  it('deep-links a scenario', () => {
    expect(noteTargetLink(target({ kind: 'scenario', targetId: 'scenario-1' }))).toEqual({
      commands: ['/scenarios', 'scenario-1'],
      queryParams: {},
      fragment: undefined,
    });
  });

  it('deep-links an instrument by symbol', () => {
    expect(noteTargetLink(target({ kind: 'instrument', targetId: 'BNB' }))).toEqual({
      commands: ['/radar', 'BNB'],
      queryParams: {},
      fragment: undefined,
    });
  });

  it('refuses to build a link to a deleted target', () => {
    expect(noteTargetLink(target({ available: false, targetId: null }))).toBeNull();
  });
});
