/**
 * List-level historical outlook: the equal-weight typical forward move across members that have
 * a per-instrument base rate.
 *
 * `forward7dMedianPct` / `forward30dMedianPct` are `undefined` (never a fabricated `0`) when no
 * member carries the underlying value. Like every reading in this app, this is a **historical
 * base-rate, not a forecast** — the UI frames it with an explicit not-advice disclaimer.
 */
export interface WatchlistOutlook {
  forward7dMedianPct?: number;
  forward30dMedianPct?: number;
  /** How many members contributed at least one forward median. */
  contributingCount: number;
  /** Total members in the list. */
  memberCount: number;
}
