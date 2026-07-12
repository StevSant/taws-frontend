/**
 * A single news article, optionally linked to one or more instruments.
 * Mirrors `NewsItemResponse` (`GET /api/v1/news`) — always carries `source`
 * and `publishedAt` (HU1 acceptance criteria).
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
}
