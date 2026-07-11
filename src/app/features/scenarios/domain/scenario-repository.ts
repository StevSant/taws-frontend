import { ScenarioIntake } from './models/scenario-intake.model';
import { ScenarioMonitor } from './models/scenario-monitor.model';
import { ScenarioPreset } from './models/scenario-preset.model';
import { ScenarioResult } from './models/scenario-result.model';

/**
 * Domain port for the Scenario Simulation engine (issue #12). An abstract
 * class (not an interface) so it can double as an Angular DI token — bind
 * the concrete adapter via
 * `{ provide: ScenarioRepository, useClass: HttpScenarioRepository }`.
 */
export abstract class ScenarioRepository {
  /** Lists the curated preset scenarios for the preset picker. */
  abstract fetchPresets(): Promise<ScenarioPreset[]>;

  /**
   * Runs the Scenario Simulation graph end to end for either a curated
   * preset id or free-form text and returns the persisted `ScenarioResult`.
   * Not user-scoped on the backend (unauthenticated) — a scenario run is
   * shared/global research, same visibility model as `POST /api/v1/signals/generate`.
   */
  abstract generateScenario(intake: ScenarioIntake): Promise<ScenarioResult>;

  /**
   * "Arm monitor" action (issue #18/#34): turns a saved `ScenarioResult`
   * into a standing Watchdog rule that pings the current user over Telegram
   * if the scenario looks like it's materializing. Authenticated (unlike
   * `generateScenario`) — the backend ties the monitor to the requesting
   * user for delivery. Idempotent: re-arming (including re-arming a
   * `matched`/`expired` monitor) resets it to `armed` with a fresh window.
   */
  abstract armMonitor(scenarioId: string): Promise<ScenarioMonitor>;

  /**
   * Disarms the current user's monitor for this scenario, if any.
   * Idempotent — a no-op if the user never armed it or already disarmed it.
   */
  abstract disarmMonitor(scenarioId: string): Promise<void>;
}
