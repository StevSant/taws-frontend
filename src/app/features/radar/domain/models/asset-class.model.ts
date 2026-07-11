/**
 * Broad category an instrument belongs to. Mirrors the backend's
 * `AssetClass` StrEnum (`domain/market/entities/asset_class.py`) value-for-value
 * so query params sent to `/api/v1/news` and `/api/v1/instruments` are valid
 * without any translation layer.
 */
export type AssetClass = 'stock' | 'crypto' | 'credit' | 'commodity' | 'forex';

/** Every asset class, in a stable display order for filter dropdowns. */
export const ASSET_CLASSES: readonly AssetClass[] = [
  'stock',
  'crypto',
  'credit',
  'commodity',
  'forex',
];
