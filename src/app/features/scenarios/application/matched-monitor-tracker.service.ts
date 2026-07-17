import { Injectable } from '@angular/core';
import { ScenarioMonitorSnapshot, ScenarioMonitorStatus } from '../domain';

/**
 * Stateful diff/dedup for the scenario-monitor poller — the sibling of
 * `NewSignalsTracker` for radar news. Tracks the last-seen `status` per
 * `scenarioId` so {@link ScenarioMonitorPoller} fires a bell notification
 * exactly once, on the tick a monitor first transitions to `matched`.
 *
 * The first poll only establishes a baseline and returns `[]` (same contract as
 * `NewSignalsTracker.detectNew`): a monitor that was already `matched` before the
 * app loaded must not re-alert on every reload — only a *new* match while the app
 * is open should surface.
 */
@Injectable({ providedIn: 'root' })
export class MatchedMonitorTracker {
  private lastStatusByScenarioId: Map<string, ScenarioMonitorStatus> | null = null;

  /**
   * Returns the monitors that just transitioned to `matched` since the last poll.
   * First call returns `[]` and only records the baseline. Once a monitor is seen
   * `matched`, later polls won't re-emit it (its recorded status stays `matched`).
   */
  detectNewlyMatched(snapshots: readonly ScenarioMonitorSnapshot[]): ScenarioMonitorSnapshot[] {
    const current = new Map(snapshots.map((snapshot) => [snapshot.scenarioId, snapshot.status]));

    if (this.lastStatusByScenarioId === null) {
      this.lastStatusByScenarioId = current;
      return [];
    }

    const previous = this.lastStatusByScenarioId;
    const newlyMatched = snapshots.filter(
      (snapshot) =>
        snapshot.status === 'matched' && previous.get(snapshot.scenarioId) !== 'matched',
    );
    this.lastStatusByScenarioId = current;
    return newlyMatched;
  }
}
