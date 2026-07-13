import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { DemoAuthPerspective } from '../../features/auth/domain/models/demo-auth-perspective.model';

/**
 * Central read-only access point for environment-driven configuration.
 * No component or service should import `environment` directly outside this
 * service — this keeps every configurable value swappable from one place.
 */
@Injectable({ providedIn: 'root' })
export class AppConfigService {
  readonly apiBaseUrl: string = environment.apiBaseUrl;
  readonly production: boolean = environment.production;
  /** Whether server-side TTS is available; gates the primary TTS provider. */
  readonly ttsEnabled: boolean = environment.ttsEnabled;
  /** Whether server-side STT is available; gates the primary STT provider. */
  readonly sttEnabled: boolean = environment.sttEnabled;
  /**
   * Whether the realtime voice agent (`POST /api/v1/chat/realtime/session`) is
   * available. When false, the Talk button is hidden — never rendered as a dead
   * control that only yields a 503.
   */
  readonly realtimeEnabled: boolean = environment.realtimeEnabled;
  /** ICE servers (STUN + TURN) for the realtime voice WebRTC connection. */
  readonly realtimeIceServers: RTCIceServer[] = environment.realtimeIceServers;
  readonly supabaseUrl: string = environment.supabaseUrl;
  readonly supabaseAnonKey: string = environment.supabaseAnonKey;
  /** How often the radar page re-polls for new signals, in ms (see radar-store.ts). */
  readonly radarPollIntervalMs: number = environment.radarPollIntervalMs;
  readonly instrumentsCacheTtlMs: number = environment.instrumentsCacheTtlMs;
  readonly newsCacheTtlMs: number = environment.newsCacheTtlMs;
  readonly signalsCacheTtlMs: number = environment.signalsCacheTtlMs;
  readonly watchlistsCacheTtlMs: number = environment.watchlistsCacheTtlMs;
  readonly scenarioPresetsCacheTtlMs: number = environment.scenarioPresetsCacheTtlMs;
  readonly radarSignalFetchBatchSize: number = environment.radarSignalFetchBatchSize;
  /** Page size for the paginated "all news" list at /radar/news (see news-list-store.ts). */
  readonly newsListPageSize: number = environment.newsListPageSize;
  /** Per-request timeout for `GET /api/v1/news` (see http-news-repository.ts). */
  readonly newsRequestTimeoutMs: number = environment.newsRequestTimeoutMs;
  /** Per-request timeout for the "Analizar ahora" force-analysis call (an LLM-latency budget). */
  readonly analyzeNewsRequestTimeoutMs: number = environment.analyzeNewsRequestTimeoutMs;
  /** Initial timeframe requested when rendering an instrument price chart (see asset-price-chart). */
  readonly chartDefaultTimeframe: string = environment.chartDefaultTimeframe;
  /** Dev-only demo personas for role-based one-click login. */
  readonly demoAuthPerspectives: DemoAuthPerspective[] = environment.demoAuthPerspectives;
}
