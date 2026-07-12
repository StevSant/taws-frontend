/** Caps how many distinct symbols a "new signals" notification names before summarizing the rest. */
const MAX_NOTIFICATION_SYMBOLS = 3;

/**
 * Builds a short, human-readable summary of the instrument symbols behind a
 * batch of newly detected news items, e.g. `"AAPL, TSLA"` or
 * `"AAPL, TSLA, MSFT +2 more"` once `symbols` exceeds
 * `MAX_NOTIFICATION_SYMBOLS`. Returns `undefined` when there are no symbols
 * to name (e.g. a poll tick whose new items are all unlinked to an
 * instrument), so the caller can fall back to a bare-count notification.
 */
export function formatNewSignalsDetail(symbols: string[]): string | undefined {
  if (symbols.length === 0) {
    return undefined;
  }

  const shown = symbols.slice(0, MAX_NOTIFICATION_SYMBOLS);
  const remaining = symbols.length - shown.length;
  return remaining > 0 ? `${shown.join(', ')} +${remaining} more` : shown.join(', ');
}
