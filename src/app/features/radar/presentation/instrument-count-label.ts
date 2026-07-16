import { TranslationService } from '../../../core';

/**
 * "3 instrumentos" / "1 instrumento".
 *
 * The translation layer is a flat key→string lookup with no interpolation or plural rules, so the
 * caller has to pick the right key. Without this the UI read "1 instruments".
 */
export function instrumentCountLabel(count: number, i18n: TranslationService): string {
  const key = count === 1 ? 'radar.watchlists.instrument' : 'radar.watchlists.instruments';
  return `${count} ${i18n.t(key)}`;
}
