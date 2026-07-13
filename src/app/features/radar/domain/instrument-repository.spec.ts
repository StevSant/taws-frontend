import { describe, expect, it } from 'vitest';
import { InstrumentRepository } from './instrument-repository';

/** Minimal concrete stub satisfying every abstract member of `InstrumentRepository`. */
class StubInstrumentRepository extends InstrumentRepository {
  async fetchInstruments() {
    return [];
  }
  async searchCoins() {
    return [];
  }
  async registerInstrument() {
    return { instrument: null as never, watchlisted: false };
  }
}

describe('InstrumentRepository (Slice 4 — search + register ports)', () => {
  it('declares an abstract searchCoins(query) method', async () => {
    const repository: InstrumentRepository = new StubInstrumentRepository();
    await expect(repository.searchCoins('doge')).resolves.toEqual([]);
  });

  it('declares an abstract registerInstrument(candidate) method', async () => {
    const repository: InstrumentRepository = new StubInstrumentRepository();
    const result = await repository.registerInstrument({
      id: 'dogecoin',
      symbol: 'doge',
      name: 'Dogecoin',
      marketCapRank: 10,
      thumb: 'https://example.com/doge.png',
    });
    expect(result).toEqual({ instrument: null, watchlisted: false });
  });
});
