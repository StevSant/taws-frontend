import { EventStudyStats } from '../domain/models/event-study-stats.model';
import { EventStudyStatsDto } from './event-study-dto';

export function mapEventStudyDto(dto: EventStudyStatsDto): EventStudyStats {
  return {
    instrumentSymbol: dto.instrument_symbol,
    lookbackDays: dto.lookback_days,
    moveThresholdPct: dto.move_threshold_pct,
    sampleSize: dto.sample_size,
    medianReturnPct: dto.median_return_pct,
    minReturnPct: dto.min_return_pct,
    maxReturnPct: dto.max_return_pct,
    forward1dMedianPct: dto.forward_1d_median_pct,
    forward7dMedianPct: dto.forward_7d_median_pct,
    forward30dMedianPct: dto.forward_30d_median_pct,
    scenarioProbabilityPct: dto.scenario_probability_pct,
    scenarioProbabilitySampleSize: dto.scenario_probability_sample_size,
    scenarioProbabilityOccurrences: dto.scenario_probability_occurrences,
    scenarioProbabilityHorizonDays: dto.scenario_probability_horizon_days,
    scenarioProbabilityThresholdPct: dto.scenario_probability_threshold_pct,
    events: (dto.events ?? []).map((event) => ({
      date: new Date(event.date),
      returnPct: event.return_pct,
    })),
  };
}
