import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TranslationService } from '../../../core';
import { WatchlistStore } from '../../briefings/application';
import { WatchlistItem } from '../../briefings/domain';
import { CoinCandidate, Instrument, InstrumentRepository, RegisterInstrumentResult } from '../domain';
import { AddInstrumentStore } from './add-instrument-store';

/**
 * Minimal fake of the root `WatchlistStore` so the unit under test stays isolated from
 * `WatchlistRepository`/`AuthTokenService`/`TranslationService`. Only the members the
 * `AddInstrumentStore` reads/calls are stubbed; tests spy on `refresh`/`isFollowed`.
 */
class FakeWatchlistStore {
  readonly items = signal<WatchlistItem[]>([]).asReadonly();
  readonly error = signal<string | null>(null).asReadonly();
  readonly available = signal(false).asReadonly();
  isFollowed = (_symbol: string): boolean => false;
  refresh = async (): Promise<void> => {};
  ensureLoaded = async (): Promise<void> => {};
  addSymbol = async (_symbol: string): Promise<void> => {};
  removeItem = async (_id: string): Promise<void> => {};
}

const DOGE_CANDIDATE: CoinCandidate = {
  id: 'dogecoin',
  symbol: 'doge',
  name: 'Dogecoin',
  marketCapRank: 10,
  thumb: 'https://example.com/doge.png',
};

const DOGE_INSTRUMENT: Instrument = {
  symbol: 'DOGE',
  name: 'Dogecoin',
  assetClass: 'crypto',
  currency: 'USD',
};

/** Minimal fake port — only the two Slice 4 methods are exercised here. */
class FakeInstrumentRepository extends InstrumentRepository {
  async fetchInstruments() {
    return [];
  }
  searchCoins = vi.fn(async (): Promise<CoinCandidate[]> => []);
  registerInstrument = vi.fn(
    async (): Promise<RegisterInstrumentResult> => ({
      instrument: DOGE_INSTRUMENT,
      watchlisted: true,
    }),
  );
}

describe('AddInstrumentStore (Slice 4 — search + register)', () => {
  let store: AddInstrumentStore;
  let instrumentRepository: FakeInstrumentRepository;
  let watchlistStore: WatchlistStore;

  beforeEach(() => {
    instrumentRepository = new FakeInstrumentRepository();
    TestBed.configureTestingModule({
      providers: [
        AddInstrumentStore,
        { provide: InstrumentRepository, useValue: instrumentRepository },
        { provide: WatchlistStore, useClass: FakeWatchlistStore },
        { provide: TranslationService, useValue: { t: (key: string) => key } },
      ],
    });
    store = TestBed.inject(AddInstrumentStore);
    watchlistStore = TestBed.inject(WatchlistStore);
  });

  describe('search', () => {
    it('sets searchResults from instrumentRepository.searchCoins', async () => {
      instrumentRepository.searchCoins.mockResolvedValueOnce([DOGE_CANDIDATE]);

      await store.search('doge');

      expect(instrumentRepository.searchCoins).toHaveBeenCalledWith('doge');
      expect(store.searchResults()).toEqual([DOGE_CANDIDATE]);
    });

    it('produces an empty searchResults on a zero-hit query', async () => {
      instrumentRepository.searchCoins.mockResolvedValueOnce([]);

      await store.search('zzzzzzzzz');

      expect(store.searchResults()).toEqual([]);
    });

    it('surfaces the error on the error signal and never throws when search fails', async () => {
      instrumentRepository.searchCoins.mockRejectedValueOnce(new Error('boom'));

      await expect(store.search('doge')).resolves.toBeUndefined();
      expect(store.error()).not.toBeNull();
      expect(store.searchResults()).toEqual([]);
    });

    it('surfaces the backend detail from an HttpErrorResponse (not a generic literal)', async () => {
      instrumentRepository.searchCoins.mockRejectedValueOnce(
        new HttpErrorResponse({ status: 409, error: { detail: 'already registered' } }),
      );

      await store.search('doge');

      expect(store.error()).toContain('409');
      expect(store.error()).toContain('already registered');
    });
  });

  describe('registerAndFollow', () => {
    it('calls registerInstrument then refreshes followedItems', async () => {
      const refreshSpy = vi.spyOn(watchlistStore, 'refresh').mockResolvedValue(undefined);

      await store.registerAndFollow(DOGE_CANDIDATE);

      expect(instrumentRepository.registerInstrument).toHaveBeenCalledWith(DOGE_CANDIDATE);
      expect(refreshSpy).toHaveBeenCalled();
    });

    it('is a no-op when the symbol is already followed', async () => {
      vi.spyOn(watchlistStore, 'isFollowed').mockReturnValue(true);

      await store.registerAndFollow(DOGE_CANDIDATE);

      expect(instrumentRepository.registerInstrument).not.toHaveBeenCalled();
    });

    it('surfaces the error on the error signal and never throws when registration fails', async () => {
      instrumentRepository.registerInstrument.mockRejectedValueOnce(new Error('conflict'));

      await expect(store.registerAndFollow(DOGE_CANDIDATE)).resolves.toBeUndefined();
      expect(store.error()).not.toBeNull();
    });
  });
});
