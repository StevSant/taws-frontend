import { AssetClass } from './asset-class.model';
import { EnrichedInstrument } from './enriched-instrument.model';

/** Sortable columns for the markets explorer. Mirrors the backend `InstrumentSortField`. */
export type InstrumentSortField = 'price' | 'change' | 'name';

/** Sort order. Mirrors the backend `SortDirection`. */
export type SortDirection = 'asc' | 'desc';

/** Explorer "hero" leaderboards, computed server-side over the full filtered set. */
export interface InstrumentHighlights {
  topGainers: EnrichedInstrument[];
  topLosers: EnrichedInstrument[];
  mostVolatile: EnrichedInstrument[];
  trending: EnrichedInstrument[];
}

/** One page of enriched rows + highlights. Mirrors `InstrumentPageResponse`. */
export interface InstrumentPage {
  items: EnrichedInstrument[];
  total: number;
  page: number;
  pageSize: number;
  highlights: InstrumentHighlights;
}

/** Query params for the enriched instruments listing. */
export interface EnrichedInstrumentQuery {
  assetClass?: AssetClass | null;
  search?: string | null;
  sortBy?: InstrumentSortField;
  sortDir?: SortDirection;
  page?: number;
  pageSize?: number;
}
