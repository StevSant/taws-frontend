import { AssetClass } from './models/asset-class.model';
import { CoinCandidate } from './models/coin-candidate.model';
import { Instrument } from './models/instrument.model';
import { RegisterInstrumentResult } from './models/register-instrument-result.model';

/**
 * Domain port for the curated instrument universe. An abstract class (not an
 * interface) so it can double as an Angular DI token — bind the concrete
 * adapter via `{ provide: InstrumentRepository, useClass: HttpInstrumentRepository }`.
 */
export abstract class InstrumentRepository {
  /** Returns every instrument in the universe, optionally scoped to one asset class. */
  abstract fetchInstruments(assetClass?: AssetClass | null): Promise<Instrument[]>;

  /** Resolves crypto candidates for a free-text query via CoinGecko `/search`. */
  abstract searchCoins(query: string): Promise<CoinCandidate[]>;

  /** Registers a resolved candidate as a global instrument and follows it on the caller's watchlist. */
  abstract registerInstrument(candidate: CoinCandidate): Promise<RegisterInstrumentResult>;
}
