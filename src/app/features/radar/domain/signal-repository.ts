import { Signal } from './models/signal.model';

/**
 * Domain port for fetching Analyst-produced signals for an instrument. An
 * abstract class (not an interface) so it can double as an Angular DI
 * token — bind the concrete adapter via
 * `{ provide: SignalRepository, useClass: HttpSignalRepository }`.
 */
export abstract class SignalRepository {
  /** Returns every signal recorded for one instrument symbol. */
  abstract fetchSignals(symbol: string): Promise<Signal[]>;
}
