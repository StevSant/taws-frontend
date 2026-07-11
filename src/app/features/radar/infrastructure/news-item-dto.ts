/** Wire shape of `NewsItemResponse` as returned by `GET /api/v1/news`. */
export interface NewsItemDto {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  published_at: string;
  related_symbols: string[];
}
