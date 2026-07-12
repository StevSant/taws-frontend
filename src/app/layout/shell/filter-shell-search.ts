import { ASSET_CLASSES, AssetClass, Instrument } from '../../features/radar/domain';

export type ShellSearchResult =
  | {
      kind: 'instrument';
      symbol: string;
      name: string;
      assetClass: AssetClass;
    }
  | {
      kind: 'assetClass';
      assetClass: AssetClass;
      label: string;
    }
  | {
      kind: 'topic';
      query: string;
    };

const MAX_RESULTS = 8;

export function filterShellSearch(
  query: string,
  instruments: Instrument[],
  assetClassLabels: Record<AssetClass, string>,
): ShellSearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) {
    return [];
  }

  const results: ShellSearchResult[] = [];
  const seenAssetClasses = new Set<AssetClass>();
  const seenSymbols = new Set<string>();

  for (const assetClass of ASSET_CLASSES) {
    const label = assetClassLabels[assetClass].toLowerCase();
    if (assetClass.includes(normalized) || label.includes(normalized)) {
      seenAssetClasses.add(assetClass);
      results.push({ kind: 'assetClass', assetClass, label: assetClassLabels[assetClass] });
    }
  }

  for (const instrument of instruments) {
    const symbol = instrument.symbol.toLowerCase();
    const name = instrument.name.toLowerCase();
    if (!symbol.includes(normalized) && !name.includes(normalized)) {
      continue;
    }

    if (seenSymbols.has(instrument.symbol)) {
      continue;
    }

    seenSymbols.add(instrument.symbol);
    results.push({
      kind: 'instrument',
      symbol: instrument.symbol,
      name: instrument.name,
      assetClass: instrument.assetClass,
    });
  }

  return results.slice(0, MAX_RESULTS);
}

export function shellSearchResultKey(result: ShellSearchResult): string {
  switch (result.kind) {
    case 'instrument':
      return `instrument:${result.symbol}`;
    case 'assetClass':
      return `assetClass:${result.assetClass}`;
    case 'topic':
      return `topic:${result.query}`;
  }
}
