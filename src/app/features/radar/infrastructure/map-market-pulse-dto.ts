import {
  FearGreedClassification,
  MarketIndexQuote,
  MarketPulse,
} from '../domain/models/market-pulse.model';
import { MarketPulseDto } from './market-pulse-dto';

const CLASSIFICATIONS = new Set<FearGreedClassification>([
  'extreme_fear',
  'fear',
  'neutral',
  'greed',
  'extreme_greed',
]);

export function mapMarketPulseDto(dto: MarketPulseDto): MarketPulse {
  const classification = CLASSIFICATIONS.has(dto.classification as FearGreedClassification)
    ? (dto.classification as FearGreedClassification)
    : 'neutral';

  return {
    value: dto.value,
    classification,
    asOf: new Date(dto.as_of),
    deltaPoints: dto.delta_points,
    market: dto.market,
    source: dto.source,
    indices: dto.indices.map(
      (index): MarketIndexQuote => ({
        symbol: index.symbol,
        label: index.label,
        price: index.price,
        changePct: index.change_pct,
      }),
    ),
  };
}
