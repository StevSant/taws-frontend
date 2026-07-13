import { describe, expect, it } from 'vitest';
import { ScenarioResult } from '../../domain';
import { deriveScenarioPipelineTrace } from './derive-scenario-pipeline-trace';

const result: ScenarioResult = {
  id: 'scenario-1',
  spec: {
    entity: 'BTC',
    eventType: 'price_move',
    magnitude: 'high',
    horizon: 'short_term',
    title: 'BTC moves sharply',
    description: 'A defined market scenario',
    targetPrice: 100_000,
    direction: 'up',
    timeframeDays: 30,
    likelihoodPct: 12.5,
    likelihoodSampleSize: 40,
    likelihoodOccurrences: 5,
    likelihoodMethod: 'historical_windows',
    affectedSymbols: ['BTC', 'ETH'],
    affectedAssetClasses: ['crypto', 'stock'],
    presetId: null,
  },
  title: 'Scenario result',
  narrative: 'Integrated narrative',
  impactMap: [
    {
      assetClass: 'crypto',
      direction: 'positive',
      confidence: 0.8,
      evidence: [
        { evidenceType: 'actual_data', detail: '[actual data] One' },
        { evidenceType: 'historical_analog', detail: '[historical analog] Two' },
      ],
    },
    {
      assetClass: 'stock',
      direction: 'uncertain',
      confidence: 0.6,
      evidence: [{ evidenceType: 'reasoning', detail: '[reasoning] Three' }],
    },
  ],
  consequenceChain: {
    id: 'chain-1',
    subject: 'BTC propagation',
    nodes: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ],
    edges: [
      { sourceNodeId: 'a', targetNodeId: 'b', mechanism: 'First', confidence: 0.7 },
      { sourceNodeId: 'b', targetNodeId: 'c', mechanism: 'Second', confidence: 0.9 },
    ],
    disclaimer: 'Illustrative',
    createdAt: '2026-07-12T00:00:00Z',
  },
  recommendedActions: ['Review exposure', 'Set an alert'],
  agentContributions: [],
  consensus: null,
  disclaimer: 'Not advice',
  createdAt: '2026-07-12T00:00:00Z',
};

describe('deriveScenarioPipelineTrace', () => {
  it('derives honest aggregate metrics from the scenario result', () => {
    expect(deriveScenarioPipelineTrace(result)).toEqual({
      evidenceCount: 3,
      impactCount: 2,
      nodeCount: 3,
      edgeCount: 2,
      averageCausalConfidence: 0.8,
      averageImpactConfidence: 0.7,
      actionCount: 2,
      symbolCount: 2,
      assetClassCount: 2,
      likelihoodPct: 12.5,
      likelihoodSampleSize: 40,
      likelihoodOccurrences: 5,
      completedContributionCount: 0,
      failedContributionCount: 0,
    });
  });

  it('returns null averages when no confidence-bearing records exist', () => {
    const emptyResult: ScenarioResult = {
      ...result,
      impactMap: [],
      consequenceChain: { ...result.consequenceChain, edges: [] },
    };

    const trace = deriveScenarioPipelineTrace(emptyResult);

    expect(trace.averageCausalConfidence).toBeNull();
    expect(trace.averageImpactConfidence).toBeNull();
  });
});
