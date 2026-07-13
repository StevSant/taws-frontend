import { NewsAssetImpact } from '../domain';
import { NewsAssetImpactDto } from './news-asset-impact-dto';

/**
 * Maps a `NewsAssetImpactDto` (snake_case wire shape) to the domain `NewsAssetImpact`.
 *
 * `null` becomes `undefined` (absent), never `0`: a missing price, sentiment or confidence is
 * "we don't know", and `0` would render as a real, flat number the Analyst never claimed.
 */
export function mapNewsAssetImpactDto(dto: NewsAssetImpactDto): NewsAssetImpact {
  return {
    symbol: dto.symbol,
    name: dto.name,
    assetClass: dto.asset_class,
    lastPrice: dto.last_price ?? undefined,
    priceDeltaPct: dto.price_delta_pct ?? undefined,
    sentimentScore: dto.sentiment_score ?? undefined,
    impactClass: dto.impact_class ?? undefined,
    confidence: dto.confidence ?? undefined,
    signalId: dto.signal_id ?? undefined,
  };
}
