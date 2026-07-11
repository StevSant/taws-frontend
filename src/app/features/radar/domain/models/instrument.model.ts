import { AssetClass } from './asset-class.model';

/**
 * A single tradable/trackable instrument in the curated universe. Mirrors
 * `InstrumentResponse` (`GET /api/v1/instruments`).
 */
export interface Instrument {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  currency: string;
}
