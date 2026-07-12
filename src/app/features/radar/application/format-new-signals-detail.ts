import { NewsItem } from '../domain';

/** Caps how many distinct symbols a "new signals" notification names before summarizing the rest. */
const MAX_NOTIFICATION_SYMBOLS = 3;

/** Headlines shown when symbols are missing or as extra context. */
const MAX_NOTIFICATION_TITLES = 2;

const MAX_TITLE_LENGTH = 84;

function truncateTitle(title: string, max = MAX_TITLE_LENGTH): string {
  const trimmed = title.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }

  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Builds a short, human-readable summary of the instrument symbols behind a
 * batch of newly detected news items, e.g. `"AAPL, TSLA"` or
 * `"AAPL, TSLA, MSFT (+2)"` once `symbols` exceeds
 * `MAX_NOTIFICATION_SYMBOLS`. Returns `undefined` when there are no symbols
 * to name.
 */
export function formatNewSignalsDetail(symbols: string[]): string | undefined {
  if (symbols.length === 0) {
    return undefined;
  }

  const shown = symbols.slice(0, MAX_NOTIFICATION_SYMBOLS);
  const remaining = symbols.length - shown.length;
  return remaining > 0 ? `${shown.join(', ')} (+${remaining})` : shown.join(', ');
}

/**
 * Rich notification body for newly polled news: prefers linked symbols, then
 * falls back to article headlines so alerts stay useful even when the API
 * omits `related_symbols`.
 */
export function formatNewNewsNotificationDetail(items: NewsItem[]): string | undefined {
  if (items.length === 0) {
    return undefined;
  }

  const symbols = Array.from(new Set(items.flatMap((item) => item.relatedSymbols)));
  const symbolDetail = formatNewSignalsDetail(symbols);

  const titles = items
    .map((item) => truncateTitle(item.title))
    .filter((title) => title.length > 0);

  const titleDetail = (() => {
    if (titles.length === 0) {
      return undefined;
    }

    const shown = titles.slice(0, MAX_NOTIFICATION_TITLES);
    const remaining = titles.length - shown.length;
    const joined = shown.join(' · ');
    return remaining > 0 ? `${joined} (+${remaining})` : joined;
  })();

  if (symbolDetail && titleDetail) {
    const extraItems = items.length > 1 ? ` (+${items.length - 1})` : '';
    return `${symbolDetail}: ${titles[0]}${extraItems}`;
  }

  return symbolDetail ?? titleDetail;
}
