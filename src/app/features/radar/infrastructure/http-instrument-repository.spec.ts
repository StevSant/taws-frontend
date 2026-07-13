import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppConfigService } from '../../../core';
import { HttpInstrumentRepository } from './http-instrument-repository';

describe('HttpInstrumentRepository (Slice 4 — search + register)', () => {
  let repository: HttpInstrumentRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        HttpInstrumentRepository,
        { provide: AppConfigService, useValue: { apiBaseUrl: 'https://api.example.com' } },
      ],
    });
    repository = TestBed.inject(HttpInstrumentRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('searchCoins', () => {
    it('calls GET /api/v1/instruments/search?q=<query> and maps DTOs to CoinCandidate', async () => {
      const pending = repository.searchCoins('doge');

      const req = httpMock.expectOne(
        (candidate) =>
          candidate.url === 'https://api.example.com/api/v1/instruments/search' &&
          candidate.params.get('q') === 'doge',
      );
      expect(req.request.method).toBe('GET');
      req.flush([
        {
          id: 'dogecoin',
          symbol: 'doge',
          name: 'Dogecoin',
          market_cap_rank: 10,
          thumb: 'https://example.com/doge.png',
        },
      ]);

      const results = await pending;
      expect(results).toEqual([
        {
          id: 'dogecoin',
          symbol: 'doge',
          name: 'Dogecoin',
          marketCapRank: 10,
          thumb: 'https://example.com/doge.png',
        },
      ]);
    });

    it('maps a null market_cap_rank through unchanged', async () => {
      const pending = repository.searchCoins('zzz');

      const req = httpMock.expectOne(
        (candidate) => candidate.url === 'https://api.example.com/api/v1/instruments/search',
      );
      req.flush([
        {
          id: 'zzz-coin',
          symbol: 'zzz',
          name: 'ZZZ Coin',
          market_cap_rank: null,
          thumb: 'https://example.com/zzz.png',
        },
      ]);

      const results = await pending;
      expect(results[0].marketCapRank).toBeNull();
    });

    it('returns an empty array for zero hits', async () => {
      const pending = repository.searchCoins('zzzzzzzzz');

      const req = httpMock.expectOne(
        (candidate) => candidate.url === 'https://api.example.com/api/v1/instruments/search',
      );
      req.flush([]);

      const results = await pending;
      expect(results).toEqual([]);
    });
  });

  describe('registerInstrument', () => {
    it('calls POST /api/v1/instruments with the candidate payload and maps the result', async () => {
      const pending = repository.registerInstrument({
        id: 'dogecoin',
        symbol: 'doge',
        name: 'Dogecoin',
        marketCapRank: 10,
        thumb: 'https://example.com/doge.png',
      });

      const req = httpMock.expectOne('https://api.example.com/api/v1/instruments');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        coingecko_id: 'dogecoin',
        symbol: 'doge',
        name: 'Dogecoin',
      });
      req.flush({
        instrument: {
          symbol: 'DOGE',
          name: 'Dogecoin',
          asset_class: 'CRYPTO',
          currency: 'USD',
        },
        watchlisted: true,
      });

      const result = await pending;
      expect(result).toEqual({
        instrument: {
          symbol: 'DOGE',
          name: 'Dogecoin',
          assetClass: 'CRYPTO',
          currency: 'USD',
        },
        watchlisted: true,
      });
    });

    it('maps watchlisted:false through unchanged (502 partial-failure outcome shape)', async () => {
      const pending = repository.registerInstrument({
        id: 'dogecoin',
        symbol: 'doge',
        name: 'Dogecoin',
        marketCapRank: 10,
        thumb: 'https://example.com/doge.png',
      });

      const req = httpMock.expectOne('https://api.example.com/api/v1/instruments');
      req.flush({
        instrument: {
          symbol: 'DOGE',
          name: 'Dogecoin',
          asset_class: 'CRYPTO',
          currency: 'USD',
        },
        watchlisted: false,
      });

      const result = await pending;
      expect(result.watchlisted).toBe(false);
    });
  });
});
