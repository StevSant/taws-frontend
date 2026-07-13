import { SignalImpact } from '../../domain';

/**
 * BEM modifier suffix for a linked-signal chip's impact accent. The card SCSS
 * pairs each with a semantic token:
 * positive → --color-gain, negative → --color-loss,
 * neutral → --color-text-secondary, uncertain → --color-warn.
 */
export function linkedSignalImpactClass(impact: SignalImpact): string {
  return `briefing-card__signal--${impact}`;
}
