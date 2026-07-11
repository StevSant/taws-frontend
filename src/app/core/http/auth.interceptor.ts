import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AppConfigService } from '../config/app-config.service';
import { AuthTokenService } from '../auth/auth-token.service';

/**
 * Functional interceptor that attaches a bearer token to outgoing requests
 * bound for our own API (`AppConfigService.apiBaseUrl`) when a token is
 * present. Requests to any other host (e.g. the Supabase Auth SDK's own
 * calls, or any third-party API) pass through unmodified via `next(req)` —
 * the token must never leak to a host we don't control.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(AppConfigService);

  // Compare parsed origins, not a string prefix: `startsWith` would let a host like
  // `https://api.example.com.evil.com` pass a `https://api.example.com` base check.
  const requestOrigin = new URL(req.url, window.location.origin).origin;
  const apiOrigin = new URL(config.apiBaseUrl, window.location.origin).origin;
  if (requestOrigin !== apiOrigin) {
    return next(req);
  }

  const token = inject(AuthTokenService).currentToken();

  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
