import { ConsequenceChain } from './consequence-chain.model';
import { ScenarioAssetClassImpact } from './scenario-asset-class-impact.model';
import { ScenarioSpec } from './scenario-spec.model';

/**
 * The Scenario Simulation graph's final, persisted output (issue #12) — the
 * Analyst-style synthesis of a "what-if" scenario's likely market impact.
 * Mirrors `ScenarioResultResponse`
 * (`domain/scenario/entities/scenario_result.py`), returned by
 * `POST /api/v1/scenarios/generate`, `GET /api/v1/scenarios/{id}`, and
 * `GET /api/v1/scenarios`.
 */
export interface ScenarioResult {
  id: string;
  spec: ScenarioSpec;
  title: string;
  narrative: string;
  impactMap: ScenarioAssetClassImpact[];
  consequenceChain: ConsequenceChain;
  recommendedActions: string[];
  disclaimer: string;
  /** ISO-8601 timestamp, as returned by the API. */
  createdAt: string;
}
