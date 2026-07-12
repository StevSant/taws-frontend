import { ImpactClass } from '../domain';

/** Wire shape of `SignalResponse` as returned by `GET /api/v1/signals`. */
export interface SignalDto {
  id: string;
  instrument_symbol: string;
  impact_class: ImpactClass;
  confidence: number;
  price_delta: number | null;
  created_at: string;
  /**
   * Real analytical output (issue #40). All optional so responses from a
   * backend predating these fields don't break the mapper.
   *
   * `analysis_available === false` means classification fell back to an
   * uncertain/zero-confidence call (no LLM key or an unparseable response) —
   * the UI labels those "análisis no disponible" instead of rendering an empty
   * thesis as if it were a real judgment.
   */
  thesis?: string;
  key_drivers?: string[];
  risk_factors?: string[];
  analysis_available?: boolean;
  disclaimer?: string;
}
