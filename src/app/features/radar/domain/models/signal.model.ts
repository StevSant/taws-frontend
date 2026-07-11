import { ImpactClass } from './impact-class.model';

/**
 * An Analyst-produced classification for one instrument. Mirrors
 * `SignalResponse` (`GET /api/v1/signals`) — only the fields the Radar UI
 * renders on a signal card (evidence/disclaimer come from the linked news
 * items shown separately, so they're not duplicated here).
 */
export interface Signal {
  id: string;
  instrumentSymbol: string;
  impactClass: ImpactClass;
  confidence: number;
  priceDelta?: number;
  createdAt: string;
}
