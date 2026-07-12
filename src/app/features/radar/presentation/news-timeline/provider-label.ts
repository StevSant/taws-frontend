/**
 * Human-readable display names for the upstream data providers the backend
 * may report on a `NewsItem` (`provider` field). Provider names are proper
 * nouns/brand names, so they are not translated.
 */
const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  finnhub: 'Finnhub',
  newsapi: 'NewsAPI',
  marketaux: 'Marketaux',
  rss: 'RSS',
  sec_edgar: 'SEC EDGAR',
  fixture: 'Fixture',
};

/**
 * Resolves a `NewsItem.provider` value to its display label for the news
 * timeline badge. Returns `null` when there's nothing to show (field absent,
 * e.g. from a cached/older backend response that predates the field).
 * Unknown provider ids fall back to the raw value so new providers still
 * render something reasonable without a frontend change.
 */
export function providerLabel(provider?: string): string | null {
  if (!provider) {
    return null;
  }
  return PROVIDER_DISPLAY_NAMES[provider] ?? provider;
}
