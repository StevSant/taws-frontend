/**
 * Production environment configuration.
 * Swapped in for environment.ts during production builds (see angular.json fileReplacements).
 * Set the real API URL via build-time replacement or a hosting platform env var if needed.
 *
 * Same Supabase project as environment.ts (anon key is safe to ship client-side
 * — see comment there). Fill in `supabaseAnonKey` before deploying.
 */
export const environment = {
  production: true,
  apiBaseUrl: 'http://localhost:8000',
  supabaseUrl: 'https://jtvaogvsjjpspypmnwgm.supabase.co',
  supabaseAnonKey: '',
  /** How often the radar page re-polls `/api/v1/news` for new signals, in ms. */
  radarPollIntervalMs: 60_000,
  demoAuthPerspectives: [] as const,
};
