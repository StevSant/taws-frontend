/**
 * Wire shape of `ScenarioMonitorStatusResponse` as returned by
 * `GET /api/v1/scenarios/monitors` (issue #18 / C3). Leaner than
 * {@link ScenarioMonitorDto} and enriched with the scenario `title`.
 */
export interface ScenarioMonitorSnapshotDto {
  scenario_id: string;
  title: string;
  status: 'armed' | 'matched' | 'expired';
  armed_at?: string | null;
  matched_at?: string | null;
  match_reason?: string | null;
}
