/** Wire shape of `NewsItemResponse` as returned inside `GET /api/v1/news`'s `items` array. */
export interface NewsItemDto {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  published_at: string;
  related_symbols: string[];
  /**
   * Upstream data provider (e.g. `"finnhub"`, `"newsapi"`, `"marketaux"`,
   * `"rss"`, `"sec_edgar"`, `"fixture"`). Optional: absent on responses from
   * a backend that predates this field.
   */
  provider?: string;
}
