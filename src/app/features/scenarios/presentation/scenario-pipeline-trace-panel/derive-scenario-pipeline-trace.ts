import { ScenarioResult } from '../../domain';

export interface ScenarioPipelineTrace {
  evidenceCount: number;
  impactCount: number;
  nodeCount: number;
  edgeCount: number;
  averageCausalConfidence: number | null;
  averageImpactConfidence: number | null;
  actionCount: number;
  symbolCount: number;
  assetClassCount: number;
  likelihoodPct: number | null;
  likelihoodSampleSize: number;
  likelihoodOccurrences: number;
  completedContributionCount: number;
  failedContributionCount: number;
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

/** Derives display-only pipeline metrics from the persisted scenario result. */
export function deriveScenarioPipelineTrace(result: ScenarioResult): ScenarioPipelineTrace {
  return {
    evidenceCount: result.impactMap.reduce((total, impact) => total + impact.evidence.length, 0),
    impactCount: result.impactMap.length,
    nodeCount: result.consequenceChain.nodes.length,
    edgeCount: result.consequenceChain.edges.length,
    averageCausalConfidence: average(result.consequenceChain.edges.map((edge) => edge.confidence)),
    averageImpactConfidence: average(result.impactMap.map((impact) => impact.confidence)),
    actionCount: result.recommendedActions.length,
    symbolCount: result.spec.affectedSymbols.length,
    assetClassCount: result.spec.affectedAssetClasses.length,
    likelihoodPct: result.spec.likelihoodPct,
    likelihoodSampleSize: result.spec.likelihoodSampleSize,
    likelihoodOccurrences: result.spec.likelihoodOccurrences,
    completedContributionCount: result.agentContributions.filter(
      (item) => item.status === 'completed',
    ).length,
    failedContributionCount: result.agentContributions.filter((item) => item.status === 'failed')
      .length,
  };
}
