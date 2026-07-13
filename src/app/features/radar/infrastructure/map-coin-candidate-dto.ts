import { CoinCandidate } from '../domain';
import { CoinCandidateDto } from './coin-candidate-dto';

/** Maps a `CoinCandidateDto` (snake_case wire shape) to the domain `CoinCandidate`. */
export function mapCoinCandidateDto(dto: CoinCandidateDto): CoinCandidate {
  return {
    id: dto.id,
    symbol: dto.symbol,
    name: dto.name,
    marketCapRank: dto.market_cap_rank,
    thumb: dto.thumb,
  };
}
