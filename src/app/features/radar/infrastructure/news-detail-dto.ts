import { NewsAssetImpactDto } from './news-asset-impact-dto';
import { NewsItemDto } from './news-item-dto';

/**
 * Wire shape of `NewsDetailResponse` (`GET /api/v1/news/{id}`).
 *
 * Extends `NewsItemDto` rather than nesting it: the backend widened the payload additively, so
 * the article's own fields are still at the top level exactly where they always were. Both new
 * collections are optional so a response from a backend that predates issue #57 still maps.
 */
export interface NewsDetailDto extends NewsItemDto {
  affected_instruments?: NewsAssetImpactDto[] | null;
  related_news?: NewsItemDto[] | null;
}
