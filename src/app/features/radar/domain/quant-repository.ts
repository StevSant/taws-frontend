import { EventStudyStats } from './models/event-study-stats.model';
import { MarketStats } from './models/market-stats.model';

export abstract class QuantRepository {
  abstract fetchMarketStats(symbol: string, windowDays?: number): Promise<MarketStats>;

  /**
   * Historical base-rate for one instrument: after similar past moves, what the asset typically
   * did next (`GET /api/v1/quant/event-study`). Not a forecast — see `EventStudyStats`.
   */
  abstract fetchEventStudy(
    symbol: string,
    opts?: { lookbackDays?: number; moveThresholdPct?: number },
  ): Promise<EventStudyStats>;
}
