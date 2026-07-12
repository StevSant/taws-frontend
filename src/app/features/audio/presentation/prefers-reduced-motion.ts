/**
 * Reads the user's `prefers-reduced-motion` preference. Used to suppress the
 * animated playback indicator (the audio itself is exempt — only the VISUAL
 * feedback must respect the preference). SSR-safe: returns false when
 * `window.matchMedia` is unavailable.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
