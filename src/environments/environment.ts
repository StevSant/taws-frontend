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
   * ICE servers for the realtime voice WebRTC connection. STUN lets ICE find
   * server-reflexive candidates; TURN RELAYS the media when the network
   * (symmetric / restrictive NAT) blocks a direct path — without TURN the
   * browser reports "ICE failed, add a TURN server" and the audio drops. The
   * `openrelay` TURN below is a FREE public demo relay (fine for hackathon /
   * testing — rate-limited and NOT for production). Swap in your own
   * (Cloudflare TURN or self-hosted coturn) for a reliable deployment.
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
  /** In-memory GET cache TTLs (ms) — avoids refetching on every route revisit. */
  instrumentsCacheTtlMs: 5 * 60_000,
  newsCacheTtlMs: 30_000,
  /**
   * Signal + quant-stats cache TTL. Kept comfortably larger than
   * `radarPollIntervalMs` so the cache actually absorbs the radar's 2×N
   * per-tick lookups — if this equals the poll interval it expires exactly as
   * the next tick fires and the cache never helps (see issue #44).
   */
  signalsCacheTtlMs: 5 * 60_000,
  watchlistsCacheTtlMs: 60_000,
  scenarioPresetsCacheTtlMs: 5 * 60_000,
  /** Max parallel `/api/v1/signals` lookups while enriching the radar feed. */
  radarSignalFetchBatchSize: 6,
  /** Page size (`limit`) for the paginated "all news" list at /radar/news. */
  newsListPageSize: 20,
  /**
   * Per-request timeout for `GET /api/v1/news`. The backend re-aggregates
   * upstream providers on cache misses (~5-6s), and concurrent polls queue
   * behind it — 8s produced spurious "Timeout has occurred" banners.
   */
  newsRequestTimeoutMs: 20_000,
  /**
   * Initial timeframe requested when rendering an instrument's price chart via
   * `POST /api/v1/charts/render`. Must be one of the backend's
   * `chart_available_timeframes` tokens (1m/3m/6m/1y/max) — the chart's own
   * timeframe buttons re-request the others.
   */
  chartDefaultTimeframe: '1y',
  /** One-click demo logins — empty in production builds. */
  demoAuthPerspectives: DEMO_AUTH_PERSPECTIVES,
};
