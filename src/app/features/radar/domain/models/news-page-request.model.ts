/**
 * Pagination window for `GET /api/v1/news` — maps 1:1 to the backend's
 * `limit` / `offset` query params.
 */
export interface NewsPageRequest {
  limit: number;
  offset: number;
}
