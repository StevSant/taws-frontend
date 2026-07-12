import { PriceDirection } from './price-direction.model';

/**
 * Maps a numeric change to a {@link PriceDirection}. Null/undefined or a value
 * within the flat epsilon resolves to `'flat'` so the UI never colors noise.
 */
export function resolvePriceDirection(
  value: number | null | undefined,
  flatEpsilon = 0,
): PriceDirection {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'flat';
  }
  if (value > flatEpsilon) {
    return 'up';
  }
  if (value < -flatEpsilon) {
    return 'down';
  }
  return 'flat';
}
