/** Chart palette read from the app's CSS variables so charts follow the active theme. */
export interface ChartTheme {
  textPrimary: string;
  textSecondary: string;
  surface: string;
  gold: string;
  gain: string;
  loss: string;
  grid: string;
}

function cssVar(styles: CSSStyleDeclaration, name: string, fallback: string): string {
  const value = styles.getPropertyValue(name).trim();
  return value || fallback;
}

/**
 * Read the current theme colors from `:root` CSS variables (see styles/_tokens.scss).
 * Called on render and whenever the theme signal changes, so charts re-theme in place.
 */
export function readChartTheme(): ChartTheme {
  const styles = getComputedStyle(document.documentElement);
  return {
    textPrimary: cssVar(styles, '--color-text-primary', '#e2e8f0'),
    textSecondary: cssVar(styles, '--color-text-secondary', '#94a3b8'),
    surface: cssVar(styles, '--color-surface', '#0e0e0e'),
    gold: cssVar(styles, '--color-gold', '#d4a017'),
    gain: cssVar(styles, '--color-gain', '#22c55e'),
    loss: cssVar(styles, '--color-loss', '#ff3b5c'),
    grid: cssVar(styles, '--color-text-secondary', '#94a3b8'),
  };
}
