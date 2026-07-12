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
  /**
   * Whether server-side TTS (`POST /api/v1/chat/speak`) is available. When
   * false, message playback uses the browser Web Speech fallback directly
   * instead of calling the endpoint just to receive a 503.
   */
  ttsEnabled: true,
  /**
   * Whether server-side STT (`POST /api/v1/chat/transcribe`) is available. When
   * false, voice dictation uses the browser Web Speech fallback directly
   * instead of POSTing audio to the endpoint just to receive a 503.
   */
  sttEnabled: true,
  /**
   * Whether the realtime voice agent (`POST /api/v1/chat/realtime/session`) is
   * available. When false, the Talk button is hidden so the user never sees a
   * dead control that only returns a 503. Requires OPENAI_REALTIME_ENABLED=true
   * on the backend.
   */
  realtimeEnabled: true,
  /**
   * ICE servers for the realtime voice WebRTC connection. STUN finds
   * server-reflexive candidates; TURN RELAYS the media when a symmetric /
   * restrictive NAT blocks a direct path (browser: "ICE failed, add a TURN
   * server"). The `openrelay` TURN is a free public demo relay — replace with
   * your own (Cloudflare TURN / self-hosted coturn) for production reliability.
   *
   * Kept to <=5 servers: browsers warn "Using five or more STUN/TURN servers
   * slows down discovery". One STUN plus the TURN :443 (UDP) and :443?transport=tcp
   * (TCP fallback for firewalled networks) cover the useful relay paths.
   */
  realtimeIceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ] as RTCIceServer[],
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
  /** Page size (`limit`) for the paginated "all news" list at /radar/news. */
  newsListPageSize: 20,
  /** Per-request timeout for `GET /api/v1/news` (backend re-aggregates on cache misses). */
  newsRequestTimeoutMs: 20_000,
  /**
   * Initial timeframe requested when rendering an instrument's price chart via
   * `POST /api/v1/charts/render` — one of the backend's timeframe tokens
   * (1m/3m/6m/1y/max); the chart's timeframe buttons re-request the others.
   */
  chartDefaultTimeframe: '1y',
  /**
   * Demo perspective accounts are intentionally shipped in production so
   * hackathon reviewers can one-click sign in. These are throwaway @midas.demo
   * accounts with no real data — clear this list to hide the demo picker.
   */
  demoAuthPerspectives: DEMO_AUTH_PERSPECTIVES,
};
