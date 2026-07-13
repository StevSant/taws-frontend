import { NewsItem } from './news-item.model';

/**
 * One page of browse results plus the size of the full filtered set. Mirrors the
 * backend `NewsBrowseResponse`.
 *
 * `total` is what `NewsPage`'s `hasMore` can never be: an exact count, so the page
 * can render numbered "Página X de Y" controls instead of a "load more" button.
 */
export interface NewsBrowsePage {
  items: NewsItem[];
  total: number;
  page: number;
  pageSize: number;
}
