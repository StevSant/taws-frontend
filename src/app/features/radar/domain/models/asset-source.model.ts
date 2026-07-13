/**
 * A link to the external market-data provider page for an instrument (e.g.
 * CoinGecko for crypto, Yahoo Finance for equities). Derived on the client from
 * an instrument's symbol + asset class — the backend does not expose a source
 * URL. `name` is the provider's brand name (not translated), shown in the CTA.
 */
export interface AssetSource {
  name: string;
  url: string;
}
