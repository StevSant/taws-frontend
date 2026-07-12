export interface MarketPulseDto {
  value: number;
  classification: string;
  as_of: string;
  delta_points: number;
  market: string;
  source: string;
  indices: Array<{
    symbol: string;
    label: string;
    price: number;
    change_pct: number;
  }>;
}
