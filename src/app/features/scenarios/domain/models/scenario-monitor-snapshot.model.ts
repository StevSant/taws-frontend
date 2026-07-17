import { ScenarioMonitorStatus } from './scenario-monitor-status.model';

/**
 * One row of the caller's armed Scenario Monitors with its live status, as returned by
 * `GET /api/v1/scenarios/monitors` (mirrors the backend `ScenarioMonitorStatusResponse`).
 *
 * Leaner than {@link ScenarioMonitor} — it carries only what the in-app notification
 * poller ({@link ScenarioMonitorPoller}) needs to diff an `armed`->`matched` breach and
 * build the bell copy: the `scenarioId` (dedup key + deep-link target), the originating
 * scenario `title`, the `status`, and the match context.
 */
export interface ScenarioMonitorSnapshot {
  scenarioId: string;
  title: string;
  status: ScenarioMonitorStatus;
  /** ISO-8601 timestamps as returned by the API; `null` while a monitor is still armed. */
  armedAt: string | null;
  matchedAt: string | null;
  matchReason: string | null;
}
