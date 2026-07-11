import { ImpactClass } from './impact-class.model';
import { Instrument } from './instrument.model';
import { MarketStats } from './market-stats.model';
import { NewsItem } from './news-item.model';

/**
 * One signal card: an instrument symbol plus the news evidence linked to it
 * within the active filter window.
 *
 * `instrument` is `undefined` when a news item references a symbol outside
 * the loaded universe (fixture data or an instruments-load failure) — the
 * card still renders using the bare symbol instead of crashing or
 * fabricating a name/asset class.
 *
 * `impactClass`/`confidence`/`priceDelta` come from the latest `Signal`
 * recorded for this instrument (`GET /api/v1/signals`, see
 * `RadarStore.loadSignals`) and stay `undefined` when the Analyst hasn't
 * produced one yet for this instrument. The UI renders an "unclassified"
 * state instead of a fabricated badge whenever they're missing.
 */
export interface RadarSignal {
  symbol: string;
  instrument?: Instrument;
  /** Linked news items, most-recent first. */
  news: NewsItem[];
  impactClass?: ImpactClass;
  confidence?: number;
  priceDelta?: number;
  /** Latest persisted Analyst signal id, when one exists for this instrument. */
  signalId?: string;
  /** Quant stats for sparkline / live price context (independent of Analyst signal). */
  marketStats?: MarketStats;
}
