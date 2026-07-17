import { ScenarioMonitorSnapshot } from '../domain';
import { ScenarioMonitorSnapshotDto } from './scenario-monitor-snapshot-dto';

/** Maps a `ScenarioMonitorSnapshotDto` (snake_case wire shape) to the domain snapshot. */
export function mapScenarioMonitorSnapshotDto(
  dto: ScenarioMonitorSnapshotDto,
): ScenarioMonitorSnapshot {
  return {
    scenarioId: dto.scenario_id,
    title: dto.title,
    status: dto.status,
    armedAt: dto.armed_at ?? null,
    matchedAt: dto.matched_at ?? null,
    matchReason: dto.match_reason ?? null,
  };
}
