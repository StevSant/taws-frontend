import { LinkedSignal } from '../../domain';

/** Backend sentinel `symbol` for a linked id it could not resolve. */
const UNRESOLVED_SYMBOL = '—';

/** One ticker's worth of archived (retention-pruned) signals, with its count. */
export interface ArchivedSignalGroup {
  symbol: string;
  count: number;
}

/**
 * The three display buckets a briefing's linked signals fall into, ready to
 * render. `active` signals still carry real impact/confidence/thesis and are
 * shown individually. `archived` signals were pruned by retention (symbol
 * known, numbers gone) so they carry no per-signal information — they are
 * deduped by ticker and collapsed. `unresolvedCount` is the tail whose symbol
 * is also gone (sentinel "—"), shown only as a count.
 */
export interface GroupedLinkedSignals {
  active: LinkedSignal[];
  archived: ArchivedSignalGroup[];
  archivedTotal: number;
  unresolvedCount: number;
}

function isUnresolved(signal: LinkedSignal): boolean {
  return signal.symbol === UNRESOLVED_SYMBOL;
}

function isArchived(signal: LinkedSignal): boolean {
  return !isUnresolved(signal) && signal.confidence === 0 && signal.title === '';
}

/**
 * Partitions a briefing's linked signals into active / archived / unresolved so
 * a report backed by many retention-pruned signals renders as one quiet
 * "N archivadas · TICKER ×n" line instead of a wall of identical archived
 * chips. Archived signals are deduped by ticker and ordered by count (desc),
 * ties broken alphabetically so the output is stable. Pure — no Angular, no
 * side effects — so it is unit-tested in isolation.
 */
export function groupLinkedSignals(signals: readonly LinkedSignal[]): GroupedLinkedSignals {
  const active: LinkedSignal[] = [];
  const archivedCounts = new Map<string, number>();
  let unresolvedCount = 0;

  for (const signal of signals) {
    if (isUnresolved(signal)) {
      unresolvedCount += 1;
      continue;
    }
    if (isArchived(signal)) {
      archivedCounts.set(signal.symbol, (archivedCounts.get(signal.symbol) ?? 0) + 1);
      continue;
    }
    active.push(signal);
  }

  const archived = [...archivedCounts.entries()]
    .map(([symbol, count]) => ({ symbol, count }))
    .sort((a, b) => b.count - a.count || a.symbol.localeCompare(b.symbol));
  const archivedTotal = archived.reduce((total, group) => total + group.count, 0);

  return { active, archived, archivedTotal, unresolvedCount };
}
