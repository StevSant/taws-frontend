import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Central read-only access point for environment-driven configuration.
 * No component or service should import `environment` directly outside this
 * service — this keeps every configurable value swappable from one place.
 */
@Injectable({ providedIn: 'root' })
export class AppConfigService {
  readonly apiBaseUrl: string = environment.apiBaseUrl;
  readonly production: boolean = environment.production;
}
