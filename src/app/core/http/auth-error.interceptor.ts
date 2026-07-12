import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { SessionRefreshService } from '../auth/session-refresh.service';
import { AuthTokenService } from '../auth/auth-token.service';
import { AppConfigService } from '../config/app-config.service';

/**
 * Response-side companion to `authInterceptor`. Scoped to our own API origin
 * (same parsed-origin check as `authInterceptor`, so third-party/Supabase SDK
 * calls are never touched), it recovers from an expired session on a `401`:
 * it asks `SessionRefreshService` for a single-flight token refresh and, on
 * success, replays the original request — which flows back through
 * `authInterceptor` and picks up the freshly refreshed token automatically
 * (this interceptor is registered *before* `authInterceptor`, so its retry
 * re-runs the token attach). On refresh failure `SessionRefreshService` signs
 * the user out, notifies once, and redirects to `/login`.
 *
 * Only requests that carried a token are treated as "expired" — an anonymous
 * `401` means the endpoint needs auth the user never had, so it's surfaced to
 * the caller unchanged rather than hijacked into a refresh/redirect (route
 * activation, via `authGuard`, owns sending anonymous users to login).
 */
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(AppConfigService);
  const authTokenService = inject(AuthTokenService);
  const sessionRefresh = inject(SessionRefreshService);

  const requestOrigin = new URL(req.url, window.location.origin).origin;
  const apiOrigin = new URL(config.apiBaseUrl, window.location.origin).origin;
  if (requestOrigin !== apiOrigin) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      const isUnauthorized = error instanceof HttpErrorResponse && error.status === 401;
      if (!isUnauthorized || !authTokenService.currentToken()) {
        return throwError(() => error);
      }

      return sessionRefresh.refresh().pipe(
        switchMap((refreshed) => {
          if (!refreshed) {
            return throwError(() => error);
          }
          // Replay the original request; `authInterceptor` (registered after
          // this one) re-attaches the now-refreshed token on the way out.
          return next(req);
        }),
      );
    }),
  );
};
