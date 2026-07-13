import { ScenarioAgentContribution } from '../../domain';

export interface ScenarioCommitteeView {
  completed: readonly ScenarioAgentContribution[];
  failedCount: number;
}

export function deriveScenarioCommitteeView(
  contributions: readonly ScenarioAgentContribution[],
): ScenarioCommitteeView {
  return {
    completed: contributions.filter((item) => item.status === 'completed'),
    failedCount: contributions.filter((item) => item.status === 'failed').length,
  };
}
