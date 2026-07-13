import { AssetClass, ImpactClass } from '../domain';

/** Wire shape of `NewsAssetImpactResponse` (`GET /api/v1/news/{id}.affected_instruments`). */
export interface NewsAssetImpactDto {
  symbol: string;
  name: string;
  asset_class: AssetClass;
  /** All nullable: the backend returns `null` rather than a fabricated value. */
  last_price?: number | null;
  price_delta_pct?: number | null;
  sentiment_score?: number | null;
  impact_class?: ImpactClass | null;
  confidence?: number | null;
  signal_id?: string | null;
}
