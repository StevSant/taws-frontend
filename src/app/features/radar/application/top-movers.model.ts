import { EnrichedInstrument } from '../domain';

/**
 * Market-wide biggest gainers / losers for the radar's "Top movers" section, sliced from the
 * enriched-instruments highlights (`top_gainers` / `top_losers`). Each side is already ranked
 * server-side; the radar only scopes it to the active asset-class chip.
 */
export interface TopMovers {
  gainers: EnrichedInstrument[];
  losers: EnrichedInstrument[];
}
