import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../../../core';

const EVALUATE_SCENARIOS_PATH = '/api/v1/watchdog/evaluate-scenarios';

/**
 * Dev-only trigger that runs one Scenario Monitor evaluation pass on demand via
 * `POST /api/v1/watchdog/evaluate-scenarios` — the exact endpoint the APScheduler calls on
 * its interval — so a breach can be fired deterministically in a demo instead of waiting for
 * the schedule (issue #18 / C3). Gated at the call site behind `AppConfigService.showDevTools`.
 * Talks to the backend directly (a thin imperative action, not a domain repository).
 */
@Injectable({ providedIn: 'root' })
export class WatchdogScenarioTrigger {
  constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfigService,
  ) {}

  /** Runs the evaluation pass and resolves with how many monitors matched this pass. */
  async evaluate(): Promise<number> {
    const matched = await firstValueFrom(
      this.http.post<unknown[]>(`${this.config.apiBaseUrl}${EVALUATE_SCENARIOS_PATH}`, {}),
    );
    return matched.length;
  }
}
