import { MacroState } from '../domain/models/macro-state.model';
import { MacroStateDto } from './macro-state-dto';

export function mapMacroStateDto(dto: MacroStateDto): MacroState {
  return {
    rates: {
      seriesId: dto.rates.series_id,
      value: dto.rates.value,
      asOf: new Date(dto.rates.as_of),
    },
    cpi: {
      seriesId: dto.cpi.series_id,
      value: dto.cpi.value,
      asOf: new Date(dto.cpi.as_of),
    },
    volatility: {
      vixLevel: dto.volatility.vix_level,
      regime: dto.volatility.regime,
      asOf: new Date(dto.volatility.as_of),
    },
  };
}
