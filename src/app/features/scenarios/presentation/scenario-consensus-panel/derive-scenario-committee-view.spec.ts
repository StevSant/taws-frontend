import { describe, expect, it } from 'vitest';
import { ScenarioAgentContribution } from '../../domain';
import { deriveScenarioCommitteeView } from './derive-scenario-committee-view';

describe('deriveScenarioCommitteeView', () => {
  it('shows only received contributions and counts honest omissions', () => {
    const contributions: ScenarioAgentContribution[] = [
      {
        agentId: 'analyst',
        status: 'completed',
        thesis: 'Grounded thesis',
        confidence: 0.8,
        keyFindings: [],
        evidenceRefs: [],
        risks: [],
        recommendation: '',
        uncertainty: '',
        failureReason: null,
      },
      {
        agentId: 'macro',
        status: 'failed',
        thesis: '',
        confidence: 0,
        keyFindings: [],
        evidenceRefs: [],
        risks: [],
        recommendation: '',
        uncertainty: 'Unavailable',
        failureReason: 'RuntimeError',
      },
    ];

    const view = deriveScenarioCommitteeView(contributions);

    expect(view.completed.map((item) => item.agentId)).toEqual(['analyst']);
    expect(view.failedCount).toBe(1);
  });
});
