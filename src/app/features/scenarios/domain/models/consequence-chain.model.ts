import { ConsequenceEdge } from './consequence-edge.model';
import { ConsequenceNode } from './consequence-node.model';

/**
 * A second-order causal chain (X -> Y -> Z, ...) embedded in a
 * `ScenarioResult`. Mirrors `ConsequenceChainResponse`
 * (`domain/consequence/entities/consequence_chain.py`). `nodes`/`edges` is
 * a general graph shape, not strictly linear — rendered here as a plain
 * node/edge list (the full causal-chain visualization is T2 issue #20, out
 * of scope for this basic result view).
 */
export interface ConsequenceChain {
  id: string;
  subject: string;
  nodes: ConsequenceNode[];
  edges: ConsequenceEdge[];
  disclaimer: string;
  /** ISO-8601 timestamp, as returned by the API. */
  createdAt: string;
}
