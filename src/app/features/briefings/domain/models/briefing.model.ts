/**
 * An Advisor-generated briefing for one watchlist (HU3). Mirrors
 * `BriefingResponse` (`GET/POST /api/v1/watchlists/{id}/briefings`).
 * Alert/task-shaped only: `summary` and `disclaimer` are prose, and
 * `linkedSignalIds` reference evidence — there is no order/quantity/price
 * field anywhere on this entity.
 */
export interface Briefing {
  id: string;
  watchlistId: string;
  summary: string;
  disclaimer: string;
  linkedSignalIds: string[];
  /** ISO-8601 timestamp, as returned by the API. */
  createdAt: string;
}
