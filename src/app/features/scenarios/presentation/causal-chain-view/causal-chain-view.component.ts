import { PercentPipe } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import { ConsequenceChain, ConsequenceEdge } from '../../domain';
import { TranslationService } from '../../../../core';

/** Confidence tiers driving the mechanism chip's border weight — a
 * non-color ("size-coded") cue alongside the tint opacity, per issue #20's
 * "color-code or size-code the arrow/label by confidence" guidance. */
type ConfidenceTier = 'low' | 'medium' | 'high';

function confidenceTier(confidence: number): ConfidenceTier {
  if (confidence < 0.4) {
    return 'low';
  }
  if (confidence < 0.7) {
    return 'medium';
  }
  return 'high';
}

/**
 * Interactive causal-chain visualization (issue #20) — upgrades #13's plain
 * node/edge `<ul>` list into a flow diagram: an overview strip of node
 * pills in emission order, plus one connector row per edge (source pill →
 * mechanism chip → target pill), each chip labeled with its mechanism text
 * and confidence.
 *
 * `ConsequenceChain` is a general node/edge graph, not guaranteed strictly
 * linear (see the model's doc comment) — the overview strip renders
 * `nodes` in the array order the backend returns, which is the chain's
 * emission order (X, then Y, then Z, ...) in every observed shape, but
 * isn't a structural guarantee for a disconnected or branching graph. The
 * edge list below is the source of truth for actual causal links and
 * renders correctly regardless of node order.
 *
 * Deliberately library-free: no d3/cytoscape. A `ConsequenceChain` carries
 * no coordinate/layout data, only node/edge references, and the agent's
 * chains are short (a handful of steps) — a flexbox flow with two cheap
 * interactions (click a node to highlight the edges it participates in;
 * click a mechanism chip to expand truncated text) covers the "interactive,
 * not just a text list" bar without the layout-engine risk/weight a real
 * graph library would add for shapes this simple.
 */
@Component({
  selector: 'app-causal-chain-view',
  standalone: true,
  imports: [PercentPipe],
  templateUrl: './causal-chain-view.component.html',
  styleUrl: './causal-chain-view.component.scss',
})
export class CausalChainViewComponent {
  @Input({ required: true }) chain!: ConsequenceChain;

  readonly selectedNodeId = signal<string | null>(null);
  readonly expandedEdgeIndex = signal<number | null>(null);

  constructor(readonly i18n: TranslationService) {}

  nodeLabel(nodeId: string): string {
    return this.chain.nodes.find((node) => node.id === nodeId)?.label ?? nodeId;
  }

  edgeInvolves(edge: ConsequenceEdge, nodeId: string): boolean {
    return edge.sourceNodeId === nodeId || edge.targetNodeId === nodeId;
  }

  confidenceTier(confidence: number): ConfidenceTier {
    return confidenceTier(confidence);
  }

  onToggleNode(nodeId: string): void {
    this.selectedNodeId.set(this.selectedNodeId() === nodeId ? null : nodeId);
  }

  onToggleEdge(index: number): void {
    this.expandedEdgeIndex.set(this.expandedEdgeIndex() === index ? null : index);
  }
}
