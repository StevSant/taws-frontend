import { NewsItem } from '../domain';
import { NewsItemDto } from './news-item-dto';

/** Maps a `NewsItemDto` (snake_case wire shape) to the domain `NewsItem`. */
export function mapNewsItemDto(dto: NewsItemDto): NewsItem {
  return {
    id: dto.id,
    title: dto.title,
    summary: dto.summary,
    url: dto.url,
    source: dto.source,
    publishedAt: dto.published_at,
    relatedSymbols: dto.related_symbols,
  };
}
