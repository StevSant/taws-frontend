/**
 * Lifecycle state of a `ScenarioMonitor` (issue #18/#34). Mirrors the
 * backend's `ScenarioMonitorStatus` StrEnum
 * (`domain/scenario/entities/scenario_monitor_status.py`) value-for-value.
 */
export type ScenarioMonitorStatus = 'armed' | 'matched' | 'expired';
