import { ScenarioMonitor } from '../domain';
import { ScenarioMonitorDto } from './scenario-monitor-dto';

/** Maps a `ScenarioMonitorDto` (snake_case wire shape) to the domain `ScenarioMonitor`. */
export function mapScenarioMonitorDto(dto: ScenarioMonitorDto): ScenarioMonitor {
  return {
    id: dto.id,
    scenarioId: dto.scenario_id,
    userId: dto.user_id,
    status: dto.status,
    armedAt: dto.armed_at,
    expiresAt: dto.expires_at,
    matchedAt: dto.matched_at,
    matchReason: dto.match_reason,
    createdAt: dto.created_at,
  };
}
