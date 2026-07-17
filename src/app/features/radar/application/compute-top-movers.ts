import { EnrichedInstrument, InstrumentHighlights } from '../domain';
import { TopMovers } from './top-movers.model';

/** An enriched row that actually carries a change % — the only ones a movers ranking can use. */
type RankedInstrument = EnrichedInstrument & { priceDeltaPct: number };

/**
 * Derives the radar's Top-movers columns.
 *
 * "Todos" (`classInstruments === null`) uses the market-wide `topGainers` / `topLosers`
 * leaderboards straight from the enriched highlights. A specific asset class **re-ranks that
 * class's own instruments, split by sign** so the columns are always disjoint (an instrument is
 * only ever a gainer OR a loser, matching the market-wide leaderboard): gainers are rows with
 * change % > 0 sorted descending, losers are rows with change % < 0 sorted ascending (most
 * negative first). Each column is capped at the count its market-wide counterpart shows. A change %
 * of 0 or null lands in neither column (undefined-safe — never fabricated as 0); a class with no
 * positive (or no negative) rows leaves that column empty.
 */
export function computeTopMovers(
  highlights: InstrumentHighlights,
  classInstruments: readonly EnrichedInstrument[] | null,
): TopMovers {
  if (classInstruments === null) {
    return { gainers: highlights.topGainers, losers: highlights.topLosers };
  }
  const ranked = classInstruments.filter(
    (instrument): instrument is RankedInstrument => instrument.priceDeltaPct !== null,
  );
  const gainers = ranked
    .filter((instrument) => instrument.priceDeltaPct > 0)
    .sort((a, b) => b.priceDeltaPct - a.priceDeltaPct);
  const losers = ranked
    .filter((instrument) => instrument.priceDeltaPct < 0)
    .sort((a, b) => a.priceDeltaPct - b.priceDeltaPct);
  return {
    gainers: gainers.slice(0, highlights.topGainers.length),
    losers: losers.slice(0, highlights.topLosers.length),
  };
}
