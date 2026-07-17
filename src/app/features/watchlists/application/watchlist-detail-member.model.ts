import { AssetClass, EventStudyStats, ImpactClass } from '../../radar/domain';

/**
 * One member of a watchlist as rendered on the detail page: instrument identity, the latest
 * Analyst read (impact/confidence/delta), and an optional historical `outlook`.
 *
 * `outlook` is best-effort — a failed or empty event-study leaves it `undefined`, and the row
 * simply omits its historical line rather than blanking. Every read field is optional because
 * the Analyst may not have scored the instrument yet.
 */
export interface WatchlistDetailMember {
  symbol: string;
  name?: string;
  assetClass?: AssetClass;
  impactClass?: ImpactClass;
  confidence?: number;
  deltaPct?: number;
  outlook?: EventStudyStats;
}
