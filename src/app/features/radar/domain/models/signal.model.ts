import { ImpactClass } from './impact-class.model';

/**
 * An Analyst-produced classification for one instrument. Mirrors
 * `SignalResponse` (`GET /api/v1/signals`) — the fields the Radar UI renders
 * on a signal card plus the real AI analysis (issue #40).
 *
 * `analysisAvailable` is `false` when classification fell back to an
 * uncertain/zero-confidence call (no LLM key or an unparseable response); the
 * UI shows an "análisis no disponible" state rather than presenting an empty
 * thesis/confidence as a genuine judgment. `thesis` is `undefined` when blank,
 * so the template can treat "no thesis" uniformly.
 */
export interface Signal {
  id: string;
  instrumentSymbol: string;
  impactClass: ImpactClass;
  confidence: number;
  priceDelta?: number;
  createdAt: string;
  thesis?: string;
  keyDrivers: string[];
  riskFactors: string[];
  analysisAvailable: boolean;
  disclaimer?: string;
}
