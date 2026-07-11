/**
 * Broad category an instrument belongs to. Mirrors the backend's
 * `AssetClass` StrEnum (`domain/market/entities/asset_class.py`) value-for-
 * value — used here for `ScenarioSpec.affectedAssetClasses` and
 * `ScenarioAssetClassImpact.assetClass`, both backed by the strict
 * `AssetClass` enum on `ScenarioSpecResponse`/`ScenarioAssetClassImpactResponse`.
 *
 * Kept as its own copy rather than importing from `features/radar` — each
 * feature stays self-contained (see `radar/domain/models/asset-class.model.ts`
 * for the same convention).
 */
export type AssetClass = 'stock' | 'crypto' | 'credit' | 'commodity' | 'forex';

/** Every asset class, in a stable display order. */
export const ASSET_CLASSES: readonly AssetClass[] = [
  'stock',
  'crypto',
  'credit',
  'commodity',
  'forex',
];
