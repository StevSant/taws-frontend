import { Injectable } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { AppConfigService, NotificationsStore } from '../../../core';
import { ScenarioRepository } from '../domain';
import { formatScenarioMatchDetail } from './format-scenario-match-detail';
import { MatchedMonitorTracker } from './matched-monitor-tracker.service';

/**
 * Polls `/api/v1/scenarios/monitors` from the shell so an armed Scenario Monitor's
 * `armed`->`matched` breach surfaces in the in-app bell on every page (issue #18 / C3) —
 * the server-side match + Telegram alert already fire via `EvaluateScenarioMonitors`; this
 * mirrors that beat into the app. Started once by `ShellComponent`, exactly like
 * `RadarNewsNotificationPoller`.
 */
@Injectable({ providedIn: 'root' })
export class ScenarioMonitorPoller {
  private subscription: Subscription | null = null;

  constructor(
    private readonly scenarioRepository: ScenarioRepository,
    private readonly config: AppConfigService,
    private readonly notifications: NotificationsStore,
    private readonly tracker: MatchedMonitorTracker,
  ) {}

  start(): void {
    if (this.subscription) {
      return;
    }

    void this.poll();
    this.subscription = interval(this.config.scenarioMonitorPollIntervalMs).subscribe(
      () => void this.poll(),
    );
  }

  /**
   * Forces an immediate poll off the interval — used by the "Run watchdog now" dev trigger
   * so the breach shows up the instant the watchdog flips a monitor to `matched`, instead of
   * waiting for the next tick.
   */
  async pollNow(): Promise<void> {
    await this.poll();
  }

  private async poll(): Promise<void> {
    try {
      const monitors = await this.scenarioRepository.listMonitors();
      const newlyMatched = this.tracker.detectNewlyMatched(monitors);

      for (const monitor of newlyMatched) {
        this.notifications.notify(
          'scenario',
          'notifications.scenario.matched',
          1,
          formatScenarioMatchDetail(monitor),
          { commands: ['/scenarios', monitor.scenarioId] },
        );
      }
    } catch {
      // Background poll — never surface errors in the shell.
    }
  }
}
