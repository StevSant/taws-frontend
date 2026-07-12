/**
 * Time-range presets (in days) for the "Contexto de mercado" sparklines and macro
 * detail view (issue #58). The default is the first entry. Backend clamps any value to
 * its configured max, so requesting the largest preset degrades gracefully.
 */
export const MACRO_RANGE_OPTIONS_DAYS: readonly number[] = [30, 90, 180, 365];

/** Default window requested for the compact "Contexto de mercado" sparklines. */
export const DEFAULT_MACRO_RANGE_DAYS = 90;
