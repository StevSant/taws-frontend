/**
 * Sortable columns for the news browse page. Mirrors the backend `NewsSortField`
 * StrEnum value-for-value, so it goes straight into the `sort_by` query param with
 * no translation layer.
 */
export type NewsSortField = 'published_at' | 'source';
