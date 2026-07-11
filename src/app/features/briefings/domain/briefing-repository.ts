import { Briefing } from './models/briefing.model';

/**
 * Domain port for Advisor briefings scoped to a watchlist (HU3). An abstract
 * class so it can double as an Angular DI token — bind the concrete adapter
 * via `{ provide: BriefingRepository, useClass: HttpBriefingRepository }`.
 */
export abstract class BriefingRepository {
  /** Lists every briefing already generated for `watchlistId`. */
  abstract listBriefings(watchlistId: string): Promise<Briefing[]>;

  /**
   * Triggers the Advisor briefing pipeline on-demand for `watchlistId` and
   * returns the newly generated briefing. Button-style trigger only —
   * scheduled/recurring generation is a separate T1 concern on the backend.
   */
  abstract generateBriefing(watchlistId: string): Promise<Briefing>;
}
