import { ImpactClass } from '../domain';

/** Wire shape of `SignalResponse` as returned by `GET /api/v1/signals`. */
export interface SignalDto {
  id: string;
  instrument_symbol: string;
  impact_class: ImpactClass;
  confidence: number;
  price_delta: number | null;
  created_at: string;
}
