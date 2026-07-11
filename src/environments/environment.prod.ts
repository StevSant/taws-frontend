import { DemoAuthPerspective } from '../app/features/auth/domain/models/demo-auth-perspective.model';
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
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0dmFvZ3Zzampwc3B5cG1ud2dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NDE1NjgsImV4cCI6MjA5OTMxNzU2OH0.NYiyrK0kzxfb5S4YBCCJUVYjOsNLyjCSYYPaP4acS3E',
  /** How often the radar page re-polls `/api/v1/news` for new signals, in ms. */
  radarPollIntervalMs: 60_000,
  instrumentsCacheTtlMs: 5 * 60_000,
  newsCacheTtlMs: 30_000,
  signalsCacheTtlMs: 60_000,
  watchlistsCacheTtlMs: 60_000,
  scenarioPresetsCacheTtlMs: 5 * 60_000,
  radarSignalFetchBatchSize: 6,
  demoAuthPerspectives: [] as DemoAuthPerspective[],
};
