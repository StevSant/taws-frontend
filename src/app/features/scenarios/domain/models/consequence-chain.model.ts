import { ConsequenceEdge } from './consequence-edge.model';
import { ConsequenceNode } from './consequence-node.model';

/**
 * A second-order causal chain (X -> Y -> Z, ...) embedded in a
 * `ScenarioResult`. Mirrors `ConsequenceChainResponse`
 * (`domain/consequence/entities/consequence_chain.py`). `nodes`/`edges` is
 * a general graph shape, not strictly linear — rendered as an interactive
 * flow diagram by `CausalChainViewComponent` (issue #20), which reads
 * `edges` as the source of truth for causal links and `nodes` order only
 * as a best-effort emission-order overview.
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
