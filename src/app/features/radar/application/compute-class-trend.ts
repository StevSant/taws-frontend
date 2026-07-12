import { EnrichedInstrument } from '../domain';

/** Shortest sampled series worth aggregating into a class mini-trend. */
const MIN_POINTS = 2;
/** Fixed number of samples the aggregate trend is resampled to, so ragged inputs align. */
const SAMPLE_COUNT = 24;

/** Normalize one series to 0..1 by its own min/max, so different price scales combine. */
function normalize(values: number[]): number[] {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length < MIN_POINTS) {
    return [];
  }
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const range = max - min;
  if (range <= 0) {
    return finite.map(() => 0.5);
  }
  return finite.map((value) => (value - min) / range);
}

/** Linearly resample a series to exactly `SAMPLE_COUNT` points so unequal lengths align. */
function resample(values: number[]): number[] {
  if (values.length === SAMPLE_COUNT) {
    return values;
  }
  const out: number[] = [];
  for (let i = 0; i < SAMPLE_COUNT; i += 1) {
    const position = (i / (SAMPLE_COUNT - 1)) * (values.length - 1);
    const low = Math.floor(position);
    const high = Math.ceil(position);
    const weight = position - low;
    out.push(values[low] * (1 - weight) + values[high] * weight);
  }
  return out;
}

/**
 * Build a representative mini-trend for an asset class by averaging each instrument's
 * self-normalized sparkline (issue #58 — the composition panel's per-class mini-trend).
 * Returns an aggregate 0..1 series (oldest → newest), or `[]` when no instrument has
 * enough history — the UI then renders a flat/neutral placeholder rather than a fake line.
 * Pure.
 */
export function computeClassTrend(instruments: EnrichedInstrument[]): number[] {
  const normalized = instruments
    .map((instrument) => normalize(instrument.sparkline))
    .filter((series) => series.length >= MIN_POINTS)
    .map(resample);

  if (normalized.length === 0) {
    return [];
  }

  const aggregate: number[] = [];
  for (let i = 0; i < SAMPLE_COUNT; i += 1) {
    const sum = normalized.reduce((total, series) => total + series[i], 0);
    aggregate.push(sum / normalized.length);
  }
  return aggregate;
}
