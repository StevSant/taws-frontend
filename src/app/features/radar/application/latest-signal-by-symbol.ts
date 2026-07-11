import { Signal } from '../domain';

/** Reduces a flat signal list to the most recent signal per instrument symbol. */
export function latestSignalBySymbol(signals: Signal[]): Map<string, Signal> {
  const bySymbol = new Map<string, Signal>();
  for (const signal of signals) {
    const existing = bySymbol.get(signal.instrumentSymbol);
    if (!existing || new Date(signal.createdAt) > new Date(existing.createdAt)) {
      bySymbol.set(signal.instrumentSymbol, signal);
    }
  }
  return bySymbol;
}
