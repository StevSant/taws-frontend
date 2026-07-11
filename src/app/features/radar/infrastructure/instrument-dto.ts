import { AssetClass } from '../domain';

/** Wire shape of `InstrumentResponse` as returned by `GET /api/v1/instruments`. */
export interface InstrumentDto {
  symbol: string;
  name: string;
  asset_class: AssetClass;
  currency: string;
}
