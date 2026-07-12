import { AnalysisStatus } from '../domain';
import { NewsEntityDto } from './news-entity-dto';

/** Wire shape of `NewsItemResponse` (both the list `items` array and `GET /api/v1/news/{id}`). */
export interface NewsItemDto {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  published_at: string;
  related_symbols: string[];
  /**
   * Upstream data provider (e.g. `"finnhub"`, `"newsapi"`, `"marketaux"`,
   * `"rss"`, `"sec_edgar"`, `"fixture"`). Optional: absent on responses from
   * a backend that predates this field.
   */
  provider?: string;
  /** Enrichment fields — `null` for non-enriching sources. */
  entities?: NewsEntityDto[] | null;
  sentiment_score?: number | null;
  analysis_status?: AnalysisStatus;
  signal_id?: string | null;
}
