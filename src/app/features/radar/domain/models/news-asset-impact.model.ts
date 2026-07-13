import { AssetClass } from './asset-class.model';
import { ImpactClass } from './impact-class.model';

/**
 * How one news article bears on one instrument it affects — the row behind the news-detail
 * page's affected-instrument chips. Mirrors `NewsAssetImpactResponse`
 * (`GET /api/v1/news/{id}.affected_instruments`).
 *
 * Every optional field is genuinely absent rather than defaulted, and the UI must render it
 * that way: `impactClass`/`confidence` exist only for the instrument the article's linked
 * signal actually targets (the backend generates signals per instrument, so an article
 * touching five tickers is classified against one of them), and `sentimentScore` only for
 * providers that score entities. Showing a `0` confidence the Analyst never produced would be
 * worse than showing nothing.
 */
export interface NewsAssetImpact {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  /** Latest price, or `undefined` when the market-data lookup came back empty. */
  lastPrice?: number;
  /** % change over the backend's price window — drives the chip's green/red delta. */
  priceDeltaPct?: number;
  sentimentScore?: number;
  impactClass?: ImpactClass;
  confidence?: number;
  signalId?: string;
}
