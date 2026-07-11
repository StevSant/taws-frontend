import { DEMO_AUTH_PERSPECTIVES } from './demo-auth-perspectives';

/**
 * Development environment configuration.
 * Overridden by environment.prod.ts in production builds (see angular.json fileReplacements).
 *
 * `supabaseUrl` is the shared TAWS Supabase project (safe to ship — the URL
 * isn't a secret; the backend uses the same one, see backend/.env). Fill in
 * `supabaseAnonKey` with the project's anon/public key from the Supabase
 * dashboard (Project Settings -> API) — NEVER the service_role key, which is
 * backend-only and must never reach the client bundle.
 */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8000',
  supabaseUrl: 'https://jtvaogvsjjpspypmnwgm.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0dmFvZ3Zzampwc3B5cG1ud2dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NDE1NjgsImV4cCI6MjA5OTMxNzU2OH0.NYiyrK0kzxfb5S4YBCCJUVYjOsNLyjCSYYPaP4acS3E',
  /** How often the radar page re-polls `/api/v1/news` for new signals, in ms. */
  radarPollIntervalMs: 60_000,
  /** In-memory GET cache TTLs (ms) — avoids refetching on every route revisit. */
  instrumentsCacheTtlMs: 5 * 60_000,
  newsCacheTtlMs: 30_000,
  signalsCacheTtlMs: 60_000,
  watchlistsCacheTtlMs: 60_000,
  scenarioPresetsCacheTtlMs: 5 * 60_000,
  /** Max parallel `/api/v1/signals` lookups while enriching the radar feed. */
  radarSignalFetchBatchSize: 6,
  /** One-click demo logins — empty in production builds. */
  demoAuthPerspectives: DEMO_AUTH_PERSPECTIVES,
};
