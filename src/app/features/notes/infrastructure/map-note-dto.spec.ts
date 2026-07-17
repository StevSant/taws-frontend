import { describe, expect, it } from 'vitest';
import { mapNoteDto } from './map-note-dto';

const BASE_DTO = {
  id: 'note-1',
  user_id: 'user-1',
  body: 'Watch the BTC/NASDAQ correlation.',
  created_at: '2026-07-17T00:00:00.000Z',
  updated_at: '2026-07-17T00:00:00.000Z',
};

describe('mapNoteDto', () => {
  it('maps an unlinked note to a null target', () => {
    expect(mapNoteDto({ ...BASE_DTO, target: null }).target).toBeNull();
  });

  it('treats a missing target key as unlinked', () => {
    expect(mapNoteDto({ ...BASE_DTO }).target).toBeNull();
  });

  it('maps a live target to camelCase', () => {
    const note = mapNoteDto({
      ...BASE_DTO,
      target: {
        kind: 'briefing',
        label: 'Crypto weakness after CPI',
        target_id: 'briefing-1',
        watchlist_id: 'watchlist-9',
        available: true,
      },
    });

    expect(note.target).toEqual({
      kind: 'briefing',
      label: 'Crypto weakness after CPI',
      targetId: 'briefing-1',
      watchlistId: 'watchlist-9',
      available: true,
    });
  });

  it('preserves the label of a target that was deleted', () => {
    const note = mapNoteDto({
      ...BASE_DTO,
      target: {
        kind: 'briefing',
        label: 'Crypto weakness after CPI',
        target_id: null,
        watchlist_id: null,
        available: false,
      },
    });

    expect(note.target?.available).toBe(false);
    expect(note.target?.label).toBe('Crypto weakness after CPI');
    expect(note.body).toBe('Watch the BTC/NASDAQ correlation.');
  });
});
