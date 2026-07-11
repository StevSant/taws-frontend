import { Instrument } from '../domain';
import { InstrumentDto } from './instrument-dto';

/** Maps an `InstrumentDto` (snake_case wire shape) to the domain `Instrument`. */
export function mapInstrumentDto(dto: InstrumentDto): Instrument {
  return {
    symbol: dto.symbol,
    name: dto.name,
    assetClass: dto.asset_class,
    currency: dto.currency,
  };
}
