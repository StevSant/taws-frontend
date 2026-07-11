import { AssetClass } from './models/asset-class.model';
import { Instrument } from './models/instrument.model';

/**
 * Domain port for the curated instrument universe. An abstract class (not an
 * interface) so it can double as an Angular DI token — bind the concrete
 * adapter via `{ provide: InstrumentRepository, useClass: HttpInstrumentRepository }`.
 */
export abstract class InstrumentRepository {
  /** Returns every instrument in the universe, optionally scoped to one asset class. */
  abstract fetchInstruments(assetClass?: AssetClass | null): Promise<Instrument[]>;
}
