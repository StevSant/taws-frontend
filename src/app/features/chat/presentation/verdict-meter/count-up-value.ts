/**
 * Eased value of a numeric count-up at a given animation `progress`.
 *
 * Maps linear `progress` (0..1, clamped) through an ease-out cubic curve — the
 * same "fast then settle" feel as the app's `cubic-bezier(0.22, 1, 0.36, 1)`
 * enters — and interpolates from `from` to `to`, rounding to a whole number so
 * the readout ticks integer-by-integer. At `progress >= 1` it returns exactly
 * `to`, guaranteeing the count lands on its target value.
 */
export function countUpValue(from: number, to: number, progress: number): number {
  const clamped = progress <= 0 ? 0 : progress >= 1 ? 1 : progress;
  const eased = 1 - Math.pow(1 - clamped, 3);
  return Math.round(from + (to - from) * eased);
}
