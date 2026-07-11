import { MarketStats } from './models/market-stats.model';

export abstract class QuantRepository {
  abstract fetchMarketStats(symbol: string, windowDays?: number): Promise<MarketStats>;
}
