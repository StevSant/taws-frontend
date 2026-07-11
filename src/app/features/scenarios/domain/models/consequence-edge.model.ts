/**
 * One causal link between two `ConsequenceNode`s in a `ConsequenceChain`.
 * Mirrors `ConsequenceEdgeResponse`
 * (`domain/consequence/entities/consequence_edge.py`).
 * `sourceNodeId`/`targetNodeId` reference `ConsequenceNode.id` values from
 * the same chain.
 */
export interface ConsequenceEdge {
  sourceNodeId: string;
  targetNodeId: string;
  mechanism: string;
  confidence: number;
}
