const STOCK_LOGOS = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META', 'JPM'] as const;

const CRYPTO_LOGOS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP'] as const;

const ETF_LOGOS = ['LQD', 'HYG', 'TLT', 'GLD', 'USO'] as const;

const FOREX_LOGOS = ['EURUSD'] as const;

export type StockLogoSymbol = (typeof STOCK_LOGOS)[number];
export type CryptoLogoSymbol = (typeof CRYPTO_LOGOS)[number];
export type EtfLogoSymbol = (typeof ETF_LOGOS)[number];
export type ForexLogoSymbol = (typeof FOREX_LOGOS)[number];
export type InstrumentLogoSymbol =
  StockLogoSymbol | CryptoLogoSymbol | EtfLogoSymbol | ForexLogoSymbol;

export type MacroIconId = 'vix' | 'fed' | 'cpi' | 'dxy';

export type UiIconId = 'radar' | 'news' | 'briefings' | 'scenarios' | 'chat' | 'watchlist';

const STOCK_SET = new Set<string>(STOCK_LOGOS);
const CRYPTO_SET = new Set<string>(CRYPTO_LOGOS);
const ETF_SET = new Set<string>(ETF_LOGOS);
const FOREX_SET = new Set<string>(FOREX_LOGOS);

/** Public URL for a bundled instrument logo, or null when no asset exists yet. */
export function instrumentLogoPath(symbol: string): string | null {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  if (STOCK_SET.has(normalized)) {
    return `/assets/logos/stocks/${normalized}.svg`;
  }
  if (CRYPTO_SET.has(normalized)) {
    return `/assets/logos/crypto/${normalized}.svg`;
  }
  if (ETF_SET.has(normalized)) {
    return `/assets/logos/etfs/${normalized}.svg`;
  }
  if (FOREX_SET.has(normalized)) {
    return `/assets/logos/forex/${normalized}.svg`;
  }

  return null;
}

export function macroIconPath(id: MacroIconId): string {
  return `/assets/icons/macro/${id}.svg`;
}

export function uiIconPath(id: UiIconId): string {
  return `/assets/icons/ui/${id}.svg`;
}

/** All symbols that currently have a bundled logo on disk. */
export function listBundledInstrumentLogos(): InstrumentLogoSymbol[] {
  return [...STOCK_LOGOS, ...CRYPTO_LOGOS, ...ETF_LOGOS, ...FOREX_LOGOS];
}
