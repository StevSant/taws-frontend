import { MacroObservationDto } from './macro-state-dto';
import { MacroIndicator } from '../domain';

/** Wire shape of `MacroSeriesResponse` (`GET /api/v1/macro/series/{indicator}`). */
export interface MacroSeriesDto {
  indicator: MacroIndicator;
  series_id: string;
  observations: MacroObservationDto[];
  latest: MacroObservationDto | null;
}
