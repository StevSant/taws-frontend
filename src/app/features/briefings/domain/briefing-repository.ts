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

  /**
   * Fetches a single briefing rendered as a PDF (`GET
   * /api/v1/briefings/{id}/export.pdf` — agreed contract with the backend
   * team, issue #22). Returns the raw `Blob` so the caller can trigger a
   * browser download; throws a descriptive `Error` on a non-2xx response
   * (including a 404 while the endpoint is still being built in parallel)
   * instead of letting the raw HTTP error leak to the UI layer.
   */
  abstract exportBriefingPdf(briefingId: string): Promise<Blob>;
}
