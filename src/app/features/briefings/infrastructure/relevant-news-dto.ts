/**
 * Wire subset of the backend's `NewsItemResponse` (`GET /api/v1/news`) that the
 * briefings strip consumes. Only the fields the strip card renders are typed
 * here — the endpoint returns more, but a briefings-local DTO keeps the feature
 * decoupled from radar's fuller `NewsItemDto`.
 */
export interface RelevantNewsDto {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  published_at: string;
  related_symbols: string[];
  /** Enrichment field — `null` for non-enriching sources. */
  sentiment_score?: number | null;
}

/** Paginated envelope `GET /api/v1/news` returns (`NewsListResponse`). */
export interface RelevantNewsListResponseDto {
  items: RelevantNewsDto[];
  has_more: boolean;
}
