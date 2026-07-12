import { MacroState } from './models/macro-state.model';
import { MacroSeries } from './models/macro-series.model';
import { MacroIndicator } from './models/macro-indicator.model';

export abstract class MacroRepository {
  abstract fetchMacroState(): Promise<MacroState>;

  /**
   * An indicator's recent history for the "Contexto de mercado" sparklines/detail (#58).
   * `days` bounds the window (backend clamps to its configured max); omit for the backend
   * default.
   */
  abstract fetchMacroSeries(indicator: MacroIndicator, days?: number): Promise<MacroSeries>;
}
