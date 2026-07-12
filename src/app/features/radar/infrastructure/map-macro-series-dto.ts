import { MacroObservation, MacroSeries } from '../domain';
import { MacroObservationDto } from './macro-state-dto';
import { MacroSeriesDto } from './macro-series-dto';

function mapObservation(dto: MacroObservationDto): MacroObservation {
  return {
    seriesId: dto.series_id,
    value: dto.value,
    asOf: new Date(dto.as_of),
  };
}

export function mapMacroSeriesDto(dto: MacroSeriesDto): MacroSeries {
  return {
    indicator: dto.indicator,
    seriesId: dto.series_id,
    observations: (dto.observations ?? []).map(mapObservation),
    latest: dto.latest ? mapObservation(dto.latest) : null,
  };
}
