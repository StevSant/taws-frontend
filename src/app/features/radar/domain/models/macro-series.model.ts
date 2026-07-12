import { MacroObservation } from './macro-state.model';
import { MacroIndicator } from './macro-indicator.model';

/**
 * An indicator's recent history for the "Contexto de mercado" sparklines and detail
 * view (issue #58). Mirrors `MacroSeriesResponse` (`GET /api/v1/macro/series/{indicator}`).
 * `observations` is ordered oldest → newest (sparkline-ready); `latest` is the most
 * recent reading, or `null` when the series came back empty (UI renders a muted state
 * rather than fabricating a value).
 */
export interface MacroSeries {
  indicator: MacroIndicator;
  seriesId: string;
  observations: MacroObservation[];
  latest: MacroObservation | null;
}
