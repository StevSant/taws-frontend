import { NewsAssetImpact } from './news-asset-impact.model';
import { NewsItem } from './news-item.model';

/**
 * Everything the news-detail page renders for one article — the whole payload of
 * `GET /api/v1/news/{id}` (issue #57), which now carries its own enrichment.
 *
 * The page used to assemble this itself: one `GET /quant/stats` per affected instrument for
 * the chip prices, plus a `GET /news?symbol=` for the related list — which silently produced
 * nothing for every article the backend's symbol linker mapped to no instrument, leaving the
 * section `@if`-gated away. One request now returns all of it.
 */
export interface NewsDetail {
  news: NewsItem;
  /** Instruments the article affects, with live price, % change, sentiment and impact. */
  affectedInstruments: NewsAssetImpact[];
  /** Other recent articles related to this one, strongest match first. */
  relatedNews: NewsItem[];
}
