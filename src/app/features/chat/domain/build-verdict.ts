import { Contribution } from './models/contribution.model';
import { Verdict, VerdictLabel } from './models/verdict.model';

/** Numeric sign each stance lends to the confidence-weighted consensus. */
const STANCE_SIGN: Record<Contribution['stance'], number> = {
  bull: 1,
  neutral: 0,
  bear: -1,
};

/** Where the meter sits when no one staked any confidence. */
const NEUTRAL_SCORE = 50;

// Score-band cut points that map a 0..100 score onto a `VerdictLabel`.
const BEARISH_BELOW = 20;
const LEAN_BEARISH_BELOW = 45;
const MIXED_AT_OR_BELOW = 55;
const LEAN_BULLISH_AT_OR_BELOW = 80;

/** Buckets a 0..100 consensus score into its verdict band. */
function resolveVerdictLabel(score: number): VerdictLabel {
  if (score < BEARISH_BELOW) return 'bearish';
  if (score < LEAN_BEARISH_BELOW) return 'lean-bearish';
  if (score <= MIXED_AT_OR_BELOW) return 'mixed';
  if (score <= LEAN_BULLISH_AT_OR_BELOW) return 'lean-bullish';
  return 'bullish';
}

/**
 * Collapses each specialist's stance + confidence into a single bull/bear verdict.
 *
 * `score` is the confidence-weighted mean of the stance signs (bull +1, neutral 0,
 * bear -1) taken over [-1, 1] and remapped onto [0, 100]; with zero total confidence
 * it defaults to the neutral midpoint. `dissenters` are the agents whose stance sign
 * opposes the net direction — naturally empty when the room is unanimous (no opposing
 * sign) or has no net lean (mean of zero, so no direction to oppose).
 */
export function buildVerdict(contributions: readonly Contribution[]): Verdict {
  const agents = contributions.map((contribution) => ({
    agent: contribution.agent,
    stance: contribution.stance,
    confidence: contribution.confidence,
  }));

  const totalConfidence = contributions.reduce((sum, item) => sum + item.confidence, 0);

  const weightedMean =
    totalConfidence === 0
      ? 0
      : contributions.reduce((sum, item) => sum + STANCE_SIGN[item.stance] * item.confidence, 0) /
        totalConfidence;

  const score = totalConfidence === 0 ? NEUTRAL_SCORE : ((weightedMean + 1) / 2) * 100;

  const majoritySign = Math.sign(weightedMean);
  const dissenters =
    majoritySign === 0
      ? []
      : contributions
          .filter((contribution) => STANCE_SIGN[contribution.stance] === -majoritySign)
          .map((contribution) => contribution.agent);

  return {
    label: resolveVerdictLabel(score),
    score,
    agents,
    dissenters,
  };
}
