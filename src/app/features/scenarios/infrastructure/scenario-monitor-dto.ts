/**
 * Wire shape of `ScenarioMonitorResponse` as returned by
 * `POST /api/v1/scenarios/{id}/arm`.
 */
export interface ScenarioMonitorDto {
  id: string;
  scenario_id: string;
  user_id: string;
  status: 'armed' | 'matched' | 'expired';
  armed_at: string;
  expires_at: string;
  matched_at: string | null;
  match_reason: string | null;
  created_at: string;
}
