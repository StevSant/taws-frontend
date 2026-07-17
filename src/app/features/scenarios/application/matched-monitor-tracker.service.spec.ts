import { describe, expect, it } from 'vitest';
import { ScenarioMonitorSnapshot, ScenarioMonitorStatus } from '../domain';
import { MatchedMonitorTracker } from './matched-monitor-tracker.service';

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

describe('MatchedMonitorTracker', () => {
  it('returns [] on the first poll so prior matches do not re-alert on load', () => {
    const tracker = new MatchedMonitorTracker();

    const result = tracker.detectNewlyMatched([snapshot('a', 'matched'), snapshot('b', 'armed')]);

    expect(result).toEqual([]);
  });

  it('emits a monitor the tick it transitions armed -> matched', () => {
    const tracker = new MatchedMonitorTracker();
    tracker.detectNewlyMatched([snapshot('a', 'armed')]);

    const result = tracker.detectNewlyMatched([snapshot('a', 'matched', 'AAPL moved +6%')]);

    expect(result.map((monitor) => monitor.scenarioId)).toEqual(['a']);
    expect(result[0].matchReason).toBe('AAPL moved +6%');
  });

  it('does not re-emit a monitor that stays matched across polls (dedup)', () => {
    const tracker = new MatchedMonitorTracker();
    tracker.detectNewlyMatched([snapshot('a', 'armed')]);
    tracker.detectNewlyMatched([snapshot('a', 'matched')]);

    const result = tracker.detectNewlyMatched([snapshot('a', 'matched')]);

    expect(result).toEqual([]);
  });

  it('emits a monitor that appears already matched after an empty baseline', () => {
    const tracker = new MatchedMonitorTracker();
    tracker.detectNewlyMatched([]);

    const result = tracker.detectNewlyMatched([snapshot('a', 'matched')]);

    expect(result.map((monitor) => monitor.scenarioId)).toEqual(['a']);
  });

  it('ignores armed and expired transitions', () => {
    const tracker = new MatchedMonitorTracker();
    tracker.detectNewlyMatched([snapshot('a', 'armed')]);

    const result = tracker.detectNewlyMatched([snapshot('a', 'expired')]);

    expect(result).toEqual([]);
  });
});
