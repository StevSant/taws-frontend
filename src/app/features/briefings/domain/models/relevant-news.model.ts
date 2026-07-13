/**
 * Minimal news article shape for the briefings "Noticias relevantes" strip.
 *
 * A briefings-local projection of the backend's `NewsItemResponse`
 * (`GET /api/v1/news`) — deliberately narrower than radar's `NewsItem` so the
 * briefings feature stays isolated from radar. Carries only what a compact
 * strip card needs: identity, headline, blurb, source, relative time, the
 * symbols that link it to a watchlist, and an optional sentiment score used
 * for the gain/loss/warn accent.
 */
export interface RelevantNews {
  id: string;
  title: string;
  /** Short blurb shown under the headline; empty string when the source has none. */
  summary: string;
  /** Publisher of the article (always present per the HU1 backend contract). */
  source: string;
  /** Canonical article URL (external); the card links in-app to the detail route instead. */
  url: string;
  /** ISO-8601 timestamp, as returned by the API. */
  publishedAt: string;
  /** Uppercased instrument symbols linking this article to the curated universe. */
  relatedSymbols: string[];
  /**
   * Sentiment score in roughly [-1, 1], populated only by enrichment-capable
   * sources — `undefined` otherwise (never defaulted to a misleading value).
   */
  sentimentScore?: number;
}
