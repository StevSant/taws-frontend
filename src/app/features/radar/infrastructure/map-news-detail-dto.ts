import { NewsDetail } from '../domain';
import { mapNewsAssetImpactDto } from './map-news-asset-impact-dto';
import { mapNewsItemDto } from './map-news-item-dto';
import { NewsDetailDto } from './news-detail-dto';

/** Maps a `NewsDetailDto` (snake_case wire shape) to the domain `NewsDetail`. */
export function mapNewsDetailDto(dto: NewsDetailDto): NewsDetail {
  return {
    news: mapNewsItemDto(dto),
    affectedInstruments: (dto.affected_instruments ?? []).map(mapNewsAssetImpactDto),
    relatedNews: (dto.related_news ?? []).map(mapNewsItemDto),
  };
}
