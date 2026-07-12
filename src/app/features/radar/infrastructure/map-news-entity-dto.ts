import { NewsEntity } from '../domain';
import { NewsEntityDto } from './news-entity-dto';

/** Maps a `NewsEntityDto` (snake_case wire shape) to the domain `NewsEntity`. */
export function mapNewsEntityDto(dto: NewsEntityDto): NewsEntity {
  return {
    symbol: dto.symbol,
    name: dto.name,
    entityType: dto.entity_type,
    industry: dto.industry ?? undefined,
    matchScore: dto.match_score ?? undefined,
    sentimentScore: dto.sentiment_score ?? undefined,
  };
}
