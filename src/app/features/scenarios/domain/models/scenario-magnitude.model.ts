/**
 * How large/impactful a scenario's event is expected to be. Mirrors the
 * backend's `ScenarioMagnitude` StrEnum
 * (`domain/scenario/entities/scenario_magnitude.py`).
 */
export type ScenarioMagnitude = 'low' | 'medium' | 'high';
