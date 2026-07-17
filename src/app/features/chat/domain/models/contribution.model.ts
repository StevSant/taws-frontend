/**
 * One specialist's stake in a multi-agent turn, streamed once (at synthesizer
 * entry) as the `contributions` frame. Each specialist declares a directional
 * `stance` on the question, how sure it is (`confidence`, 0..1) and a one-line
 * `headline` summarizing its take. Collapsed into a single bull/bear reading by
 * `buildVerdict` (see `Verdict`). Single-route turns never emit this.
 */
export interface Contribution {
  agent: string;
  stance: 'bull' | 'bear' | 'neutral';
  confidence: number;
  headline: string;
}
