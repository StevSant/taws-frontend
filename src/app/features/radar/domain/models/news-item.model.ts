import { AnalysisStatus } from './analysis-status.model';
import { NewsCategory } from './news-category.model';
import { NewsEntity } from './news-entity.model';

/**
 * A single news article, optionally linked to one or more instruments.
 * Mirrors `NewsItemResponse` (`GET /api/v1/news` and `GET /api/v1/news/{id}`)
 * — always carries `source` and `publishedAt` (HU1 acceptance criteria).
 */
export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  /** ISO-8601 timestamp, as returned by the API. */
  publishedAt: string;
  relatedSymbols: string[];
  /**
   * Upstream data provider the backend fetched this article through (e.g.
   * `"finnhub"`, `"newsapi"`, `"marketaux"`, `"rss"`, `"sec_edgar"`, `"fixture"`).
   * Optional so older/cached backend responses without this field don't break.
   */
  provider?: string;
  /**
   * Enrichment fields (issue #38 detail view). `entities`/`sentimentScore` are
   * populated only by enrichment-capable sources (currently Marketaux) and are
   * `undefined` otherwise — never defaulted to a misleading value.
   */
  entities?: NewsEntity[];
  sentimentScore?: number;
  /** Analyst-classification lifecycle for this persisted item. */
  analysisStatus?: AnalysisStatus;
  /** Id of the Signal produced for this item, when `analysisStatus === 'analyzed'`. */
  signalId?: string;
  /** Hero/thumbnail image when the upstream provider supplies one. */
  imageUrl?: string;
  /**
   * Topical category — what the article is *about*, independent of its sentiment/impact
   * (issue #69). `undefined` on responses from a backend that predates the field.
   */
  category?: NewsCategory;
}
