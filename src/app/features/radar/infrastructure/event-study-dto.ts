/** One historical occurrence as sent by `GET /api/v1/quant/event-study`. */
export interface EventStudyEventDto {
  date: string;
  return_pct: number;
}

/** Wire shape of `GET /api/v1/quant/event-study` (snake_case). */
export interface EventStudyStatsDto {
  instrument_symbol: string;
  lookback_days: number;
  move_threshold_pct: number;
  sample_size: number;
  median_return_pct: number | null;
  min_return_pct: number | null;
  max_return_pct: number | null;
  forward_1d_median_pct: number | null;
  forward_7d_median_pct: number | null;
  forward_30d_median_pct: number | null;
  scenario_probability_pct: number | null;
  scenario_probability_sample_size: number;
  scenario_probability_occurrences: number;
  scenario_probability_horizon_days: number | null;
  scenario_probability_threshold_pct: number | null;
  events: EventStudyEventDto[];
}
