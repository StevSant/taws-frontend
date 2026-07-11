export interface MacroObservationDto {
  series_id: string;
  value: number;
  as_of: string;
}

export interface VolatilityRegimeDto {
  vix_level: number;
  regime: 'low' | 'normal' | 'elevated' | 'high';
  as_of: string;
}

export interface MacroStateDto {
  rates: MacroObservationDto;
  cpi: MacroObservationDto;
  volatility: VolatilityRegimeDto;
}
