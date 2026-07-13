import { AssetClass, AssetSource } from '../domain';

const COINGECKO_COIN_URL = 'https://www.coingecko.com/en/coins/';
const COINGECKO_SEARCH_URL = 'https://www.coingecko.com/en/search?query=';
const YAHOO_FINANCE_QUOTE_URL = 'https://finance.yahoo.com/quote/';

const COINGECKO_NAME = 'CoinGecko';
const YAHOO_FINANCE_NAME = 'Yahoo Finance';

/**
 * CoinGecko coin ids for the curated crypto universe. CoinGecko coin pages are
 * keyed by coin id (e.g. `bitcoin`), not by ticker, so a ticker→id lookup is
 * required; any crypto symbol without an entry falls back to CoinGecko's search
 * page so the link still resolves to something useful.
 */
const COINGECKO_IDS: Readonly<Record<string, string>> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
};

/**
 * Derives the external market-data source page for an instrument from its symbol
 * and asset class: crypto → CoinGecko, everything else (stock / credit /
 * commodity / forex) → Yahoo Finance quote pages, which accept the plain ticker
 * (forex pairs need Yahoo's `=X` suffix, e.g. `EURUSD=X`).
 */
export function buildAssetSource(symbol: string, assetClass: AssetClass): AssetSource {
  if (assetClass === 'crypto') {
    const coinId = COINGECKO_IDS[symbol];
    const url = coinId
      ? `${COINGECKO_COIN_URL}${coinId}`
      : `${COINGECKO_SEARCH_URL}${encodeURIComponent(symbol)}`;
    return { name: COINGECKO_NAME, url };
  }

  const yahooSymbol = assetClass === 'forex' ? `${symbol}=X` : symbol;
  return { name: YAHOO_FINANCE_NAME, url: `${YAHOO_FINANCE_QUOTE_URL}${yahooSymbol}` };
}
