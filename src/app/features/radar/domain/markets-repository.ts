import { EnrichedInstrumentQuery, InstrumentPage } from './models/instrument-page.model';

/**
 * Domain port for the enriched markets listing (`GET /api/v1/instruments/enriched`).
 * An abstract class (not an interface) so it can double as an Angular DI token —
 * bind the concrete adapter via
 * `{ provide: MarketsRepository, useClass: HttpMarketsRepository }`.
 */
export abstract class MarketsRepository {
  /**
   * Fetch one filtered/sorted/paginated page of enriched instruments plus the
   * highlight leaderboards computed over the full filtered set.
   */
  abstract fetchEnrichedInstruments(query: EnrichedInstrumentQuery): Promise<InstrumentPage>;
}
