import { EventStudyEvent } from './event-study-event.model';

/**
 * An empirical historical base-rate for one instrument (`GET /api/v1/quant/event-study`).
 * camelCase mirror of the backend's `EventStudyResponse`.
 *
 * Answers "after similar past moves, the asset typically did X% next, and moves like this
 * happened Y% of the time." This is a **historical base-rate, not a price forecast** — the
 * product deliberately never promises returns. The UI must frame it with explicit uncertainty
 * and a not-advice disclaimer.
 *
 * When `sampleSize === 0` no similar historical move was found, so every `*ReturnPct` /
 * `forward*MedianPct` median is `null` — never fabricate a `0` in that case.
 */
export interface EventStudyStats {
  instrumentSymbol: string;
  lookbackDays: number;
  moveThresholdPct: number;
  /** Count of similar historical moves the medians are computed over; `0` ⇒ no base rate. */
  sampleSize: number;
  medianReturnPct: number | null;
  minReturnPct: number | null;
  maxReturnPct: number | null;
  forward1dMedianPct: number | null;
  forward7dMedianPct: number | null;
  forward30dMedianPct: number | null;
  scenarioProbabilityPct: number | null;
  scenarioProbabilitySampleSize: number;
  scenarioProbabilityOccurrences: number;
  scenarioProbabilityHorizonDays: number | null;
  scenarioProbabilityThresholdPct: number | null;
  events: EventStudyEvent[];
}
