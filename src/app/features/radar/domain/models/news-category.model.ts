/**
 * What a news item is *about* — its subject matter. Mirrors the backend `NewsCategory`
 * StrEnum value-for-value, so it goes straight into the `category` query param with no
 * translation layer.
 *
 * Deliberately orthogonal to the sentiment/impact classification (`ImpactClass`): impact
 * answers "is this good or bad for the instrument", category answers "what is it about".
 * An item can carry a category even when no signal was ever generated for it.
 *
 * `uncategorized` is its own honest state — the classifier looked and could not place the
 * item — and must not be conflated with the impact bucket "unclassified".
 */
export type NewsCategory =
  | 'macro'
  | 'earnings'
  | 'regulation'
  | 'crypto'
  | 'mergers_acquisitions'
  | 'geopolitics'
  | 'company_news'
  | 'uncategorized';

/** Every category, in the order the filter dropdown offers them. */
export const NEWS_CATEGORIES: readonly NewsCategory[] = [
  'macro',
  'earnings',
  'regulation',
  'crypto',
  'mergers_acquisitions',
  'geopolitics',
  'company_news',
  'uncategorized',
];
