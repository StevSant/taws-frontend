import { Instrument, NewsItem, RadarSignal } from '../domain';

/**
 * Groups news items by every related instrument symbol into one
 * `RadarSignal` per symbol (an item touching 3 instruments produces 3
 * cards, one per instrument — mirrors "news linked to instruments across
 * asset classes", HU1). News items with no `relatedSymbols` are dropped
 * from the result and reported via `unlinkedCount` for a transparency note
 * in the UI instead of being silently discarded.
 */
export function groupNewsByInstrument(
  news: NewsItem[],
  instrumentsBySymbol: ReadonlyMap<string, Instrument>,
): { signals: RadarSignal[]; unlinkedCount: number } {
  const newsBySymbol = new Map<string, NewsItem[]>();
  let unlinkedCount = 0;

  for (const item of news) {
    const relatedSymbols = item.relatedSymbols ?? [];
    if (relatedSymbols.length === 0) {
      unlinkedCount += 1;
      continue;
    }
    for (const symbol of relatedSymbols) {
      const existing = newsBySymbol.get(symbol);
      if (existing) {
        existing.push(item);
      } else {
        newsBySymbol.set(symbol, [item]);
      }
    }
  }

  const signals: RadarSignal[] = Array.from(newsBySymbol.entries()).map(([symbol, items]) => ({
    symbol,
    instrument: instrumentsBySymbol.get(symbol),
    news: [...items].sort((a, b) => toTime(b.publishedAt) - toTime(a.publishedAt)),
  }));

  signals.sort((a, b) => toTime(b.news[0].publishedAt) - toTime(a.news[0].publishedAt));

  return { signals, unlinkedCount };
}

function toTime(isoTimestamp: string): number {
  return new Date(isoTimestamp).getTime();
}
