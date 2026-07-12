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
  /** Initial timeframe requested when rendering an instrument price chart (see asset-price-chart). */
  readonly chartDefaultTimeframe: string = environment.chartDefaultTimeframe;
  /** Dev-only demo personas for role-based one-click login. */
  readonly demoAuthPerspectives: DemoAuthPerspective[] = environment.demoAuthPerspectives;
}
