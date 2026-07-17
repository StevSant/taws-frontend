import { describe, expect, it } from 'vitest';

import { buildVerdict } from './build-verdict';
import { Contribution } from './models/contribution.model';

describe('buildVerdict', () => {
  it('leans bullish and flags the lone bear as the dissenter', () => {
    const contributions: Contribution[] = [
      { agent: 'quant', stance: 'bull', confidence: 0.71, headline: 'Momentum is strong' },
      { agent: 'analyst', stance: 'bull', confidence: 0.65, headline: 'Fundamentals hold' },
      { agent: 'macro', stance: 'bear', confidence: 0.4, headline: 'Rates are a headwind' },
    ];

    const verdict = buildVerdict(contributions);

    expect(verdict.label).toBe('lean-bullish');
    expect(verdict.dissenters).toEqual(['macro']);
    expect(verdict.score).toBeGreaterThan(55);
    expect(verdict.agents).toHaveLength(3);
  });

  it('defaults to a neutral, mixed reading with no contributions', () => {
    const verdict = buildVerdict([]);

    expect(verdict.score).toBe(50);
    expect(verdict.label).toBe('mixed');
    expect(verdict.dissenters).toEqual([]);
  });

  it('sits at the neutral midpoint when total confidence is zero', () => {
    const contributions: Contribution[] = [
      { agent: 'quant', stance: 'bull', confidence: 0, headline: 'No conviction' },
      { agent: 'macro', stance: 'bear', confidence: 0, headline: 'No conviction' },
    ];

    const verdict = buildVerdict(contributions);

    expect(verdict.score).toBe(50);
    expect(verdict.label).toBe('mixed');
    expect(verdict.dissenters).toEqual([]);
  });

  it('names no dissenters when the room is unanimous', () => {
    const contributions: Contribution[] = [
      { agent: 'quant', stance: 'bull', confidence: 0.9, headline: 'Breakout' },
      { agent: 'analyst', stance: 'bull', confidence: 1, headline: 'Earnings beat' },
    ];

    const verdict = buildVerdict(contributions);

    expect(verdict.label).toBe('bullish');
    expect(verdict.score).toBeGreaterThan(80);
    expect(verdict.dissenters).toEqual([]);
  });

  it('names no dissenters when opposing stances cancel to no net lean', () => {
    const contributions: Contribution[] = [
      { agent: 'quant', stance: 'bull', confidence: 0.5, headline: 'Upside' },
      { agent: 'macro', stance: 'bear', confidence: 0.5, headline: 'Downside' },
    ];

    const verdict = buildVerdict(contributions);

    expect(verdict.score).toBe(50);
    expect(verdict.label).toBe('mixed');
    expect(verdict.dissenters).toEqual([]);
  });

  it('reads bearish and flags the outnumbered bull when the room leans down', () => {
    const contributions: Contribution[] = [
      { agent: 'macro', stance: 'bear', confidence: 0.9, headline: 'Recession risk' },
      { agent: 'analyst', stance: 'bear', confidence: 0.85, headline: 'Guidance cut' },
      { agent: 'quant', stance: 'bull', confidence: 0.2, headline: 'Oversold bounce' },
    ];

    const verdict = buildVerdict(contributions);

    expect(verdict.label).toBe('bearish');
    expect(verdict.score).toBeLessThan(20);
    expect(verdict.dissenters).toEqual(['quant']);
  });
});
