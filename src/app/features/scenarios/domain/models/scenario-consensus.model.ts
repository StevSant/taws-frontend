export type ScenarioAgentId =
  'analyst' | 'quant' | 'macro' | 'sentiment' | 'consequence' | 'advisor';

export type ScenarioContributionStatus = 'completed' | 'failed';

export interface ScenarioAgentContribution {
  agentId: ScenarioAgentId;
  status: ScenarioContributionStatus;
  thesis: string;
  confidence: number;
  keyFindings: string[];
  evidenceRefs: string[];
  risks: string[];
  recommendation: string;
  uncertainty: string;
  failureReason: string | null;
}

export interface ScenarioConsensus {
  summary: string;
  conclusion: string;
  agreements: string[];
  disagreements: string[];
  uncertainties: string[];
  confidence: number;
}
