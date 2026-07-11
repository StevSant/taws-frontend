import { ScenarioMonitorStatus } from './scenario-monitor-status.model';

/**
 * "Arm monitor" action's persisted state (issue #18/#34) — a standing
 * Watchdog rule that pings the arming user over Telegram if the scenario
 * looks like it's materializing. Mirrors `ScenarioMonitorResponse`
 * (`api/v1/schemas/scenario_monitor_response.py`), returned by
 * `POST /api/v1/scenarios/{id}/arm`.
 */
export interface ScenarioMonitor {
  id: string;
  scenarioId: string;
  userId: string;
  status: ScenarioMonitorStatus;
  /** ISO-8601 timestamps, as returned by the API. */
  armedAt: string;
  expiresAt: string;
  matchedAt: string | null;
  matchReason: string | null;
  createdAt: string;
}
