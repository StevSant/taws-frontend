import { Signal } from './models/signal.model';

/**
 * Domain port for fetching Analyst-produced signals for an instrument. An
 * abstract class (not an interface) so it can double as an Angular DI
 * token — bind the concrete adapter via
 * `{ provide: SignalRepository, useClass: HttpSignalRepository }`.
 */
export abstract class SignalRepository {
  /**
   * Returns every signal recorded for one instrument symbol.
   *
   * Reads are cached with a TTL. Pass `refresh` to bypass that cache when the caller knows
   * a signal was just created for this symbol out-of-band — e.g. the news detail page after
   * "Analizar ahora" (issue #27), which would otherwise re-read the pre-analysis list and
   * conclude, wrongly, that its own successful run produced nothing.
   */
  abstract fetchSignals(symbol: string, options?: { refresh?: boolean }): Promise<Signal[]>;

  /** Runs the Analyst pipeline for one instrument and persists a new signal. */
  abstract generateSignal(symbol: string): Promise<Signal>;
}
