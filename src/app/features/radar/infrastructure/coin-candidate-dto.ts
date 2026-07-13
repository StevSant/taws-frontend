/** Wire shape of `CoinCandidateResponse` as returned by `GET /api/v1/instruments/search`. */
export interface CoinCandidateDto {
  id: string;
  symbol: string;
  name: string;
  market_cap_rank: number | null;
  thumb: string;
}
