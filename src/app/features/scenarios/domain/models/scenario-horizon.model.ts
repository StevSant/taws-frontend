/**
 * The time horizon over which a scenario's effects are expected to play
 * out. Mirrors the backend's `ScenarioHorizon` StrEnum
 * (`domain/scenario/entities/scenario_horizon.py`) — four coarse buckets,
 * not a precise date/duration (a documented T1 simplification).
 */
export type ScenarioHorizon = 'immediate' | 'short_term' | 'medium_term' | 'long_term';
