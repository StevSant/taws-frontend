/**
 * Direction of a `ScenarioAssetClassImpact` — mirrors the backend's
 * `ImpactClass` StrEnum (`domain/signals/entities/impact_class.py`), reused
 * as-is by `ScenarioAssetClassImpact.direction` (see
 * `domain/scenario/entities/scenario_asset_class_impact.py`). Named
 * `ImpactDirection` here (not `ImpactClass`, matching `radar`'s copy) to
 * keep the local name aligned with the response field it maps: `direction`.
 */
export type ImpactDirection = 'positive' | 'negative' | 'neutral' | 'uncertain';

/** Every impact direction, in a stable display order. */
export const IMPACT_DIRECTIONS: readonly ImpactDirection[] = [
  'positive',
  'negative',
  'neutral',
  'uncertain',
];
