export type FearGreedClassification =
  | 'extreme_fear'
  | 'fear'
  | 'neutral'
  | 'greed'
  | 'extreme_greed';

export interface FearGreedReading {
  value: number;
  classification: FearGreedClassification;
  asOf: Date;
}
