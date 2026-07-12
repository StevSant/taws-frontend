import { FearGreedReading } from './models/fear-greed-reading.model';
import { MarketPulse } from './models/market-pulse.model';

export abstract class SentimentRepository {
  abstract fetchMarketPulse(): Promise<MarketPulse>;
  abstract fetchFearGreedIndex(): Promise<FearGreedReading>;
}
