import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, finalize, from, shareReplay, tap } from 'rxjs';
import { AuthStore } from '../../features/auth/application';
import { NotificationsStore } from '../notifications';
import { AuthTokenService } from './auth-token.service';

/**
 * Coordinates recovery from an expired session across the app. When our API
 * returns `401`, the HTTP error interceptor (`authErrorInterceptor`) asks this
 * service to refresh the Supabase token.
 *
 * The refresh is **single-flight**: several requests failing with `401` at
 * once (the Radar feed fans out 2×N calls per tick) share one in-flight
 * refresh instead of each firing its own — the shared `Observable` is
 * multicast via `shareReplay`, so the expiry side effects below run exactly
 * once per burst, not once per failed request. `finalize` clears the handle
 * when the burst settles so a later `401` triggers a fresh refresh.
 *
 * On failure it signs the user out, raises a single notification, and
 * redirects to `/login` preserving the current URL as `returnUrl` (mirroring
 * `authGuard`). It lives in `core/auth` alongside `AuthTokenService` because
 * it's cross-cutting HTTP infrastructure, not part of the auth feature UI.
 */
@Injectable({ providedIn: 'root' })
export class SessionRefreshService {
  private inFlight: Observable<boolean> | null = null;

  constructor(
    private readonly authStore: AuthStore,
    private readonly authTokenService: AuthTokenService,
    private readonly notifications: NotificationsStore,
    private readonly router: Router,
  ) {}

  /** Single-flight token refresh shared across concurrent 401s. */
  refresh(): Observable<boolean> {
    if (this.inFlight) {
      return this.inFlight;
    }
    this.inFlight = from(this.authStore.refreshSession()).pipe(
      tap((refreshed) => {
        if (!refreshed) {
          this.handleExpiry();
        }
      }),
      finalize(() => {
        this.inFlight = null;
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    return this.inFlight;
  }

  /** Signs out, notifies once, and redirects to login (unless already there). */
  private handleExpiry(): void {
    this.authTokenService.clearToken();
    this.notifications.notify('auth', 'notifications.auth.sessionExpired');
    const returnUrl = this.router.url;
    if (!returnUrl.startsWith('/login')) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl } });
    }
  }
}
