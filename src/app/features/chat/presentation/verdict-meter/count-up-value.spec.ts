import { describe, expect, it } from 'vitest';

import { countUpValue } from './count-up-value';

describe('countUpValue', () => {
  it('starts at the from value when progress is zero', () => {
    expect(countUpValue(0, 100, 0)).toBe(0);
    expect(countUpValue(20, 80, 0)).toBe(20);
  });

  it('lands exactly on the target when progress reaches one', () => {
    expect(countUpValue(0, 77, 1)).toBe(77);
    expect(countUpValue(50, 12, 1)).toBe(12);
  });

  it('clamps progress below zero to the start', () => {
    expect(countUpValue(0, 100, -0.5)).toBe(0);
  });

  it('clamps progress above one to the target', () => {
    expect(countUpValue(0, 100, 1.5)).toBe(100);
  });

  it('eases out — past the halfway value at the midpoint of the timeline', () => {
    // Ease-out cubic is already 87.5% of the way at t=0.5.
    expect(countUpValue(0, 100, 0.5)).toBe(88);
  });

  it('returns whole numbers so the readout ticks integer-by-integer', () => {
    expect(Number.isInteger(countUpValue(0, 77, 0.31))).toBe(true);
    expect(Number.isInteger(countUpValue(0, 77, 0.62))).toBe(true);
  });

  it('counts down when the target is below the start', () => {
    expect(countUpValue(100, 0, 0)).toBe(100);
    expect(countUpValue(100, 0, 1)).toBe(0);
  });
});
