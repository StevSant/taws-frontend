import { AnalysisStatus } from './analysis-status.model';
import { AssetClass } from './asset-class.model';
import { SortDirection } from './instrument-page.model';
import { NewsCategory } from './news-category.model';
import { NewsSortField } from './news-sort.model';
import { SentimentFilterOption } from './sentiment-filter.model';

/**
 * Active browse selection for the `/radar/news` page. Maps 1:1 to the
 * `GET /api/v1/news/browse` query params; `null` means "no filter" for that facet.
 *
 * Distinct from `RadarFilters` (which the radar home still uses against the live
 * `GET /api/v1/news` feed): browse adds the facets only a DB-backed read can serve —
 * source, provider, sentiment, analysis status, free-text search, sort, and a page.
 */
export interface NewsBrowseQuery {
  assetClass: AssetClass | null;
  symbol: string | null;
  source: string | null;
  provider: string | null;
  sentiment: SentimentFilterOption | null;
  category: NewsCategory | null;
  analysisStatus: AnalysisStatus | null;
  search: string | null;
  sinceHours: number;
  sortBy: NewsSortField;
  sortDir: SortDirection;
  page: number;
  pageSize: number;
}

/**
 * Browse selection the news page opens with: newest first, no filters, 48h window.
 * `pageSize` is a placeholder — `NewsListStore` overwrites it from `AppConfigService`.
 */
export const DEFAULT_NEWS_BROWSE_QUERY: NewsBrowseQuery = {
  assetClass: null,
  symbol: null,
  source: null,
  provider: null,
  sentiment: null,
  category: null,
  analysisStatus: null,
  search: null,
  sinceHours: 48,
  sortBy: 'published_at',
  sortDir: 'desc',
  page: 1,
  pageSize: 20,
};
