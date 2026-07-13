import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthTokenService, TranslationService } from '../../../core';
import { WatchlistRepository } from '../../briefings/domain';
import {
  CoinCandidate,
  EnrichedInstrumentQuery,
  InstrumentPage,
  InstrumentRepository,
  MarketsRepository,
  RegisterInstrumentResult,
} from '../domain';
import { MarketsExplorerStore } from './markets-explorer-store';

const EMPTY_PAGE: InstrumentPage = {
  items: [],
  highlights: { topGainers: [], topLosers: [], mostVolatile: [], trending: [] },
  total: 0,
  page: 1,
  pageSize: 12,
};

const DOGE: CoinCandidate = {
  id: 'dogecoin',
  symbol: 'doge',
  name: 'Dogecoin',
  marketCapRank: 10,
  thumb: 'https://example.com/doge.png',
};

class FakeMarketsRepository extends MarketsRepository {
  fetchEnrichedInstruments = vi.fn(
    async (_query: EnrichedInstrumentQuery): Promise<InstrumentPage> => EMPTY_PAGE,
  );
}

class FakeInstrumentRepository extends InstrumentRepository {
  async fetchInstruments() {
    return [];
  }
  searchCoins = vi.fn(async (): Promise<CoinCandidate[]> => []);
  registerInstrument = vi.fn(async (): Promise<RegisterInstrumentResult> => ({
    instrument: { symbol: 'DOGE', name: 'Dogecoin', assetClass: 'crypto', currency: 'USD' },
    watchlisted: true,
  }));
}

describe('MarketsExplorerStore — CoinGecko fallback (search + register)', () => {
  let store: MarketsExplorerStore;
  let markets: FakeMarketsRepository;
  let instruments: FakeInstrumentRepository;

  beforeEach(() => {
    // Fake timers so `setSearch`'s debounced reload never fires and races the assertions.
    vi.useFakeTimers();
    markets = new FakeMarketsRepository();
    instruments = new FakeInstrumentRepository();
    TestBed.configureTestingModule({
      providers: [
        MarketsExplorerStore,
        { provide: MarketsRepository, useValue: markets },
        { provide: InstrumentRepository, useValue: instruments },
        // Anonymous session → the store never touches the watchlist API, so an empty stub is safe.
        { provide: WatchlistRepository, useValue: {} as unknown as WatchlistRepository },
        { provide: AuthTokenService, useValue: { currentToken: () => null } },
        { provide: TranslationService, useValue: { t: (key: string) => key } },
      ],
    });
    store = TestBed.inject(MarketsExplorerStore);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('searchCoinGecko', () => {
    it('populates coinResults from the current query', async () => {
      store.setSearch('doge');
      instruments.searchCoins.mockResolvedValueOnce([DOGE]);

      await store.searchCoinGecko();

      expect(instruments.searchCoins).toHaveBeenCalledWith('doge');
      expect(store.coinResults()).toEqual([DOGE]);
      expect(store.coinSearched()).toBe(true);
    });

    it('is a no-op for a blank query', async () => {
      store.setSearch('   ');

      await store.searchCoinGecko();

      expect(instruments.searchCoins).not.toHaveBeenCalled();
    });

    it('surfaces the error and never throws when the search fails', async () => {
      store.setSearch('doge');
      instruments.searchCoins.mockRejectedValueOnce(
        new HttpErrorResponse({ status: 502, error: { detail: 'coingecko down' } }),
      );

      await expect(store.searchCoinGecko()).resolves.toBeUndefined();
      expect(store.coinSearchError()).toContain('502');
      expect(store.coinResults()).toEqual([]);
    });
  });

  describe('registerAndReload', () => {
    it('registers the coin then reloads the explorer', async () => {
      await store.registerAndReload(DOGE);

      expect(instruments.registerInstrument).toHaveBeenCalledWith(DOGE);
      // reload = a fresh enriched fetch so the newly-persisted coin appears in the table.
      expect(markets.fetchEnrichedInstruments).toHaveBeenCalled();
      expect(store.coinResults()).toEqual([]);
    });

    it('surfaces the error and never throws when registration fails', async () => {
      instruments.registerInstrument.mockRejectedValueOnce(
        new HttpErrorResponse({ status: 401, error: { detail: 'auth required' } }),
      );

      await expect(store.registerAndReload(DOGE)).resolves.toBeUndefined();
      expect(store.coinSearchError()).toContain('401');
    });
  });
});
