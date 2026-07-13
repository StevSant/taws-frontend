import { RelevantNews } from '../domain';
import { RelevantNewsDto } from './relevant-news-dto';

/** Maps a `RelevantNewsDto` (snake_case wire shape) to the domain `RelevantNews`. */
export function mapRelevantNewsDto(dto: RelevantNewsDto): RelevantNews {
  return {
    id: dto.id,
    title: dto.title,
    summary: dto.summary,
    url: dto.url,
    source: dto.source,
    publishedAt: dto.published_at,
    relatedSymbols: (dto.related_symbols ?? []).map((symbol) => symbol.toUpperCase()),
    sentimentScore: dto.sentiment_score ?? undefined,
  };
}
