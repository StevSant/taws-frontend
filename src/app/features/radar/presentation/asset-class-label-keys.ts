import { TranslationKey } from '../../../core';
import { AssetClass } from '../domain';

/** i18n keys for each asset class label, reused across the segmentation UI. */
export const ASSET_CLASS_LABEL_KEYS: Record<AssetClass, TranslationKey> = {
  stock: 'radar.assetClass.stock',
  crypto: 'radar.assetClass.crypto',
  credit: 'radar.assetClass.credit',
  commodity: 'radar.assetClass.commodity',
  forex: 'radar.assetClass.forex',
};
