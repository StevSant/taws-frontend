import { NewsItem } from '../domain';
import { mapNewsEntityDto } from './map-news-entity-dto';
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
    relatedSymbols: dto.related_symbols ?? [],
    provider: dto.provider,
    entities: dto.entities ? dto.entities.map(mapNewsEntityDto) : undefined,
    sentimentScore: dto.sentiment_score ?? undefined,
    analysisStatus: dto.analysis_status,
    signalId: dto.signal_id ?? undefined,
    imageUrl: dto.image_url ?? undefined,
    skipReason: dto.skip_reason ?? undefined,
    category: dto.category ?? undefined,
  };
}
