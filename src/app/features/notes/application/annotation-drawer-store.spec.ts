import { describe, expect, it } from 'vitest';
import { NoteTarget } from '../domain';
import { AnnotationDrawerStore } from './annotation-drawer-store';

const TARGET: NoteTarget = {
  kind: 'briefing',
  label: 'Crypto weakness after CPI',
  targetId: 'briefing-1',
  watchlistId: 'watchlist-9',
  available: true,
};

const OTHER: NoteTarget = {
  kind: 'scenario',
  label: 'Oil shock',
  targetId: 'scenario-1',
  watchlistId: null,
  available: true,
};

describe('AnnotationDrawerStore', () => {
  it('starts closed with no target', () => {
    const store = new AnnotationDrawerStore();

    expect(store.isOpen()).toBe(false);
    expect(store.target()).toBeNull();
  });

  it('opens onto a target', () => {
    const store = new AnnotationDrawerStore();

    store.open(TARGET);

    expect(store.isOpen()).toBe(true);
    expect(store.target()).toEqual(TARGET);
  });

  it('retargets while open', () => {
    const store = new AnnotationDrawerStore();
    store.open(TARGET);

    store.open(OTHER);

    expect(store.isOpen()).toBe(true);
    expect(store.target()).toEqual(OTHER);
  });

  it('keeps the target on close so the content does not flash empty mid-animation', () => {
    const store = new AnnotationDrawerStore();
    store.open(TARGET);

    store.close();

    expect(store.isOpen()).toBe(false);
    expect(store.target()).toEqual(TARGET);
  });
});
