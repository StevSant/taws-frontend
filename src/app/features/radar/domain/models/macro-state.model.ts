import { VolatilityRegimeLevel } from './market-stats.model';

export interface MacroObservation {
  seriesId: string;
  value: number;
  asOf: Date;
}

export interface VolatilityRegime {
  vixLevel: number;
  regime: VolatilityRegimeLevel;
  asOf: Date;
}

/** Combined macro snapshot (`GET /api/v1/macro`). */
export interface MacroState {
  rates: MacroObservation;
  cpi: MacroObservation;
  volatility: VolatilityRegime;
}
