import { NewsItem } from './news-item.model';

/**
 * One page of news plus the backend's `has_more` pagination flag
 * (`NewsListResponse` envelope of `GET /api/v1/news`).
 */
export interface NewsPage {
  items: NewsItem[];
  hasMore: boolean;
}
