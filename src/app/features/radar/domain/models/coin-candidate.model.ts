/**
 * A CoinGecko search result the user can pick from to register a new crypto
 * instrument. Mirrors `CoinCandidateResponse` (`GET /api/v1/instruments/search`).
 */
export interface CoinCandidate {
  id: string;
  symbol: string;
  name: string;
  marketCapRank: number | null;
  thumb: string;
}
