import { DEMO_AUTH_PERSPECTIVES } from './demo-auth-perspectives';
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
  apiBaseUrl: 'https://di22c2aew2.us-east-1.awsapprunner.com',
  supabaseUrl: 'https://jtvaogvsjjpspypmnwgm.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0dmFvZ3Zzampwc3B5cG1ud2dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NDE1NjgsImV4cCI6MjA5OTMxNzU2OH0.NYiyrK0kzxfb5S4YBCCJUVYjOsNLyjCSYYPaP4acS3E',
  /** How often the radar page re-polls `/api/v1/news` for new signals, in ms. */
  radarPollIntervalMs: 60_000,
  instrumentsCacheTtlMs: 5 * 60_000,
  newsCacheTtlMs: 30_000,
  /** Kept > radarPollIntervalMs so the cache absorbs the 2×N per-tick lookups (issue #44). */
  signalsCacheTtlMs: 5 * 60_000,
  watchlistsCacheTtlMs: 60_000,
  scenarioPresetsCacheTtlMs: 5 * 60_000,
  radarSignalFetchBatchSize: 6,
  /**
   * Demo perspective accounts are intentionally shipped in production so
   * hackathon reviewers can one-click sign in. These are throwaway @midas.demo
   * accounts with no real data — clear this list to hide the demo picker.
   */
  demoAuthPerspectives: DEMO_AUTH_PERSPECTIVES,
};
