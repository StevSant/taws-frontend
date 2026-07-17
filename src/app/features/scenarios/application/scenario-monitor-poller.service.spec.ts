import { describe, expect, it, vi } from 'vitest';
import { AppConfigService, NotificationsStore } from '../../../core';
import { ScenarioMonitorSnapshot, ScenarioMonitorStatus, ScenarioRepository } from '../domain';
import { MatchedMonitorTracker } from './matched-monitor-tracker.service';
import { ScenarioMonitorPoller } from './scenario-monitor-poller.service';

function snapshot(
  scenarioId: string,
  status: ScenarioMonitorStatus,
  matchReason: string | null = null,
): ScenarioMonitorSnapshot {
  return {
    scenarioId,
    title: `Scenario ${scenarioId}`,
    status,
    armedAt: '2026-07-17T00:00:00Z',
    matchedAt: status === 'matched' ? '2026-07-17T01:00:00Z' : null,
    matchReason,
  };
}

const config = { scenarioMonitorPollIntervalMs: 20_000 } as AppConfigService;

function build(repo: Pick<ScenarioRepository, 'listMonitors'>, notify = vi.fn()) {
  const notifications = { notify } as unknown as NotificationsStore;
  const poller = new ScenarioMonitorPoller(
    repo as ScenarioRepository,
    config,
    notifications,
    new MatchedMonitorTracker(),
  );
  return { poller, notify };
}

describe('ScenarioMonitorPoller', () => {
  it('notifies exactly once when a monitor newly matches, with a deep link to the scenario', async () => {
    const queue: ScenarioMonitorSnapshot[][] = [
      [snapshot('a', 'armed')],
      [snapshot('a', 'matched', 'AAPL moved +6.2% since armed')],
      [snapshot('a', 'matched', 'AAPL moved +6.2% since armed')],
    ];
    const repo = { listMonitors: () => Promise.resolve(queue.shift() ?? []) };
    const { poller, notify } = build(repo);

    await poller.pollNow(); // baseline: armed
    await poller.pollNow(); // transition armed -> matched
    await poller.pollNow(); // still matched -> deduped

    expect(notify).toHaveBeenCalledTimes(1);
    const [source, messageKey, count, detail, link] = notify.mock.calls[0];
    expect(source).toBe('scenario');
    expect(messageKey).toBe('notifications.scenario.matched');
    expect(count).toBe(1);
    expect(detail).toContain('AAPL moved +6.2% since armed');
    expect(detail).toContain('Scenario a');
    expect(link).toEqual({ commands: ['/scenarios', 'a'] });
  });

  it('swallows fetch failures so a background poll never breaks the shell', async () => {
    const repo = { listMonitors: () => Promise.reject(new Error('offline')) };
    const { poller, notify } = build(repo);

    await expect(poller.pollNow()).resolves.toBeUndefined();
    expect(notify).not.toHaveBeenCalled();
  });
});
