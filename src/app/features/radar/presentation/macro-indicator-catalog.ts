import { TranslationKey } from '../../../core';
import { MacroIndicator } from '../domain';

/** How an indicator's value is formatted for display. */
export type MacroValueFormat = 'percent' | 'currency';

/** Presentation metadata for one "Contexto de mercado" indicator (issue #58). */
export interface MacroIndicatorDescriptor {
  indicator: MacroIndicator;
  icon: string;
  labelKey: TranslationKey;
  /** Plain-language "what it is + why it matters" copy. */
  explanationKey: TranslationKey;
  format: MacroValueFormat;
}

/** Series-backed indicators, in display order, with their labels + explanations. */
export const MACRO_INDICATOR_CATALOG: readonly MacroIndicatorDescriptor[] = [
  {
    indicator: 'rates',
    icon: '🏦',
    labelKey: 'radar.macro.indicator.rates.label',
    explanationKey: 'radar.macro.indicator.rates.explanation',
    format: 'percent',
  },
  {
    indicator: 'cpi',
    icon: '📈',
    labelKey: 'radar.macro.indicator.cpi.label',
    explanationKey: 'radar.macro.indicator.cpi.explanation',
    format: 'percent',
  },
  {
    indicator: 'treasury_10y',
    icon: '🇺🇸',
    labelKey: 'radar.macro.indicator.treasury_10y.label',
    explanationKey: 'radar.macro.indicator.treasury_10y.explanation',
    format: 'percent',
  },
  {
    indicator: 'gold',
    icon: '🥇',
    labelKey: 'radar.macro.indicator.gold.label',
    explanationKey: 'radar.macro.indicator.gold.explanation',
    format: 'currency',
  },
  {
    indicator: 'oil',
    icon: '🛢️',
    labelKey: 'radar.macro.indicator.oil.label',
    explanationKey: 'radar.macro.indicator.oil.explanation',
    format: 'currency',
  },
];

/** Descriptor lookup for the detail page, which resolves an indicator from the route. */
export function macroIndicatorDescriptor(
  indicator: MacroIndicator,
): MacroIndicatorDescriptor | null {
  return MACRO_INDICATOR_CATALOG.find((entry) => entry.indicator === indicator) ?? null;
}
