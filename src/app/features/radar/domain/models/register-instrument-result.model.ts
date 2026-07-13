import { Instrument } from './instrument.model';

/**
 * Outcome of registering a CoinGecko candidate as a global instrument. Mirrors
 * `RegisterInstrumentResponse` (`POST /api/v1/instruments`). `watchlisted` is
 * `false` when the catalog write succeeded but adding it to the caller's
 * watchlist failed server-side (backend maps that case to HTTP 502).
 */
export interface RegisterInstrumentResult {
  instrument: Instrument;
  watchlisted: boolean;
}
