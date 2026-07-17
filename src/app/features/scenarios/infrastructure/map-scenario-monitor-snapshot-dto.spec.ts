import { describe, expect, it } from 'vitest';
import { mapScenarioMonitorSnapshotDto } from './map-scenario-monitor-snapshot-dto';
import { ScenarioMonitorSnapshotDto } from './scenario-monitor-snapshot-dto';

describe('mapScenarioMonitorSnapshotDto', () => {
  it('maps a matched row, carrying the reason and matched timestamp', () => {
    const dto: ScenarioMonitorSnapshotDto = {
      scenario_id: 'scenario-1',
      title: 'Fed hikes 50bp',
      status: 'matched',
      armed_at: '2026-07-14T00:00:00Z',
      matched_at: '2026-07-17T00:00:00Z',
      match_reason: 'AAPL moved +6.2% since the monitor was armed',
    };

    expect(mapScenarioMonitorSnapshotDto(dto)).toEqual({
      scenarioId: 'scenario-1',
      title: 'Fed hikes 50bp',
      status: 'matched',
      armedAt: '2026-07-14T00:00:00Z',
      matchedAt: '2026-07-17T00:00:00Z',
      matchReason: 'AAPL moved +6.2% since the monitor was armed',
    });
  });

  it('defaults omitted optional fields to null for an armed row', () => {
    const dto: ScenarioMonitorSnapshotDto = {
      scenario_id: 'scenario-2',
      title: 'Oil spikes to $120',
      status: 'armed',
      armed_at: '2026-07-16T00:00:00Z',
    };

    const snapshot = mapScenarioMonitorSnapshotDto(dto);

    expect(snapshot.matchedAt).toBeNull();
    expect(snapshot.matchReason).toBeNull();
  });
});
