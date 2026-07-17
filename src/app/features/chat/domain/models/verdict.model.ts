import { Contribution } from './contribution.model';

/**
 * The five verdict bands, ordered bearish → bullish. Never rendered raw — each
 * value doubles as the suffix of a `verdict.<label>` i18n key.
 */
export type VerdictLabel = 'bearish' | 'lean-bearish' | 'mixed' | 'lean-bullish' | 'bullish';

/** A single specialist's contribution reduced to what the meter plots. */
export interface VerdictAgent {
  agent: string;
  stance: Contribution['stance'];
  confidence: number;
}

/**
 * The room's collapsed bull/bear reading for a turn (see `buildVerdict`).
 *
 * `score` runs 0 (fully bearish) → 100 (fully bullish), with 50 the neutral
 * midpoint. `label` is the band `score` falls into. `dissenters` names the agents
 * bucking the net direction — empty when the room is unanimous or has no net lean.
 */
export interface Verdict {
  label: VerdictLabel;
  score: number;
  agents: VerdictAgent[];
  dissenters: string[];
}
