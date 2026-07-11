import { AssetClass } from './asset-class.model';

/**
 * Active radar filter selection. `null` means "no filter" for that facet.
 * Maps 1:1 to `GET /api/v1/news` query params: `assetClass` -> `asset_class`,
 * `symbol` -> `symbol`, `sinceHours` -> `since_hours`.
 */
export interface RadarFilters {
  assetClass: AssetClass | null;
  symbol: string | null;
  sinceHours: number;
}

/** Default filter selection when the radar page loads. */
export const DEFAULT_RADAR_FILTERS: RadarFilters = {
  assetClass: null,
  symbol: null,
  sinceHours: 48,
};

/** Recency options offered by the "recency" filter, in hours. */
export const RECENCY_OPTIONS_HOURS: readonly number[] = [24, 48, 168, 720];
