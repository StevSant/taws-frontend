import { NewsItemDto } from './news-item-dto';

/** Wire shape of `NewsListResponse`, the paginated envelope `GET /api/v1/news` returns. */
export interface NewsListResponseDto {
  items: NewsItemDto[];
  has_more: boolean;
}
