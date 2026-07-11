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
  supabaseAnonKey: '',
};
