/**
 * One state/event in a `ConsequenceChain`, e.g. "Fed raises rates 50bps".
 * Mirrors `ConsequenceNodeResponse`
 * (`domain/consequence/entities/consequence_node.py`). `id` is stable
 * within one chain only.
 */
export interface ConsequenceNode {
  id: string;
  label: string;
}
