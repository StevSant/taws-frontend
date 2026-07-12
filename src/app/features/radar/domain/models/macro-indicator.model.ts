/**
 * A macro-economic indicator the "Contexto de mercado" panel can chart (issue #58).
 * Mirrors the backend `MacroIndicator` StrEnum — each value maps to a configured FRED
 * series id server-side, so which concrete series backs an indicator stays in backend
 * `Settings`, never hardcoded here. `GET /api/v1/macro/series/{indicator}`.
 */
export type MacroIndicator = 'rates' | 'cpi' | 'gold' | 'oil' | 'treasury_10y';

/** All series-backed indicators, in display order. */
export const MACRO_INDICATORS: readonly MacroIndicator[] = [
  'rates',
  'cpi',
  'treasury_10y',
  'gold',
  'oil',
];
