import { InstrumentDto } from './instrument-dto';

/** Request payload for `POST /api/v1/instruments` — a resolved CoinGecko candidate. */
export interface RegisterInstrumentRequestDto {
  coingecko_id: string;
  symbol: string;
  name: string;
}

/** Response payload for `POST /api/v1/instruments`. */
export interface RegisterInstrumentResponseDto {
  instrument: InstrumentDto;
  watchlisted: boolean;
}
