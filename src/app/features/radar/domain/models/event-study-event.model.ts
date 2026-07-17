/**
 * One historical occurrence in an event study: a past day whose move matched the
 * study's threshold, plus that day's return. Sourced from `GET /api/v1/quant/event-study`.
 */
export interface EventStudyEvent {
  date: Date;
  returnPct: number;
}
