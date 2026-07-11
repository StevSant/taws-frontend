/**
 * Wire shape of `BriefingResponse` as returned by
 * `GET/POST /api/v1/watchlists/{watchlist_id}/briefings`.
 */
export interface BriefingDto {
  id: string;
  watchlist_id: string;
  summary: string;
  disclaimer: string;
  linked_signal_ids: string[];
  created_at: string;
}
