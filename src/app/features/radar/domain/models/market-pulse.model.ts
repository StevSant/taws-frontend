import type { FearGreedClassification } from './fear-greed-reading.model';

export type { FearGreedClassification };

export interface MarketIndexQuote {
  symbol: string;
  label: string;
  price: number;
  changePct: number;
}

/** Stock-market CNN Fear & Greed snapshot for the Radar macro panel. */
export interface MarketPulse {
  value: number;
  classification: FearGreedClassification;
  asOf: Date;
  deltaPoints: number;
  market: string;
  source: string;
  indices: MarketIndexQuote[];
}
