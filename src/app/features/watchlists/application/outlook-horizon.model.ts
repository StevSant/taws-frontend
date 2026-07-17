/**
 * The three forward horizons the event-study payload already carries (`forward1d/7d/30d_median_pct`).
 * The watchlist detail toggle is frontend-only — it just picks which field is displayed. '24h' maps
 * to the `forward1d` field.
 */
export type OutlookHorizon = '24h' | '7d' | '30d';
