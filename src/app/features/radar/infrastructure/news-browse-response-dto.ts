import { NewsItemDto } from './news-item-dto';

/** Wire shape of `GET /api/v1/news/browse` (snake_case, straight off the backend). */
export interface NewsBrowseResponseDto {
  items: NewsItemDto[];
  total: number;
  page: number;
  page_size: number;
}
