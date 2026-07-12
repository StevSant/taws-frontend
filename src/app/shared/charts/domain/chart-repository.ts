import { ChartRequest } from './chart-request.model';
import { ChartSpec } from './chart-spec.model';

/**
 * Domain port for re-rendering a chart at a new timeframe. Abstract class so it doubles as
 * an Angular DI token. Presentation depends on this, never on the HTTP adapter.
 */
export abstract class ChartRepository {
  /** Re-render `request` (typically with a swapped timeframe) and return the new spec. */
  abstract render(request: ChartRequest): Promise<ChartSpec>;
}
