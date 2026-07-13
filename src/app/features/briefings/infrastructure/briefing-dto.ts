/**
 * Wire shape of one `BriefingResponse.linked_signals` entry — a resolved,
 * human-readable signal reference. Additive to `linked_signal_ids` (which the
 * backend still returns). `impact` is a signal impact-class string; an
 * unresolved id degrades to `{ symbol: '—', impact: 'uncertain', confidence: 0,
 * title: '' }`.
 */
export interface LinkedSignalDto {
  signal_id: string;
  symbol: string;
  impact: string;
  confidence: number;
  title: string;
}

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
  /**
   * Enriched evidence (issue: evidence enrichment). Optional so responses from
   * a backend predating enrichment still map — the mapper defaults to `[]`.
   */
  linked_signals?: LinkedSignalDto[];
  created_at: string;
}
