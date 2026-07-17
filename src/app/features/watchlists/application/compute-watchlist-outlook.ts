import { WatchlistDetailMember } from './watchlist-detail-member.model';
import { WatchlistOutlook } from './watchlist-outlook.model';

/**
 * Reduces a watchlist's members into a list-level historical outlook: the equal-weight mean of
 * each member's `forward7dMedianPct` / `forward30dMedianPct` over the members that actually have
 * that value.
 *
 * Undefined-safe by design: a horizon with no contributing member yields `undefined`, never a
 * fabricated `0` (mirrors `computeWatchlistSummary`'s `mean`). `contributingCount` counts members
 * with any forward median; `memberCount` is the full list size.
 */
export function computeWatchlistOutlook(members: WatchlistDetailMember[]): WatchlistOutlook {
  const forward7dValues = members
    .map((member) => member.outlook?.forward7dMedianPct)
    .filter(isPresent);
  const forward30dValues = members
    .map((member) => member.outlook?.forward30dMedianPct)
    .filter(isPresent);

  const contributingCount = members.filter(
    (member) =>
      isPresent(member.outlook?.forward7dMedianPct) ||
      isPresent(member.outlook?.forward30dMedianPct),
  ).length;

  return {
    forward7dMedianPct: mean(forward7dValues),
    forward30dMedianPct: mean(forward30dValues),
    contributingCount,
    memberCount: members.length,
  };
}

/** Type guard: keeps real numbers, drops `null`/`undefined` (never a fabricated `0`). */
function isPresent(value: number | null | undefined): value is number {
  return value !== null && value !== undefined;
}

/** `undefined` for an empty set — an absent reading, never a fabricated `0`. */
function mean(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}
