import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthTokenService } from '../auth/auth-token.service';

/**
 * Functional interceptor that attaches a bearer token to outgoing requests
 * when one is present. No-op until AuthTokenService is populated (e.g. after
 * wiring Supabase Auth).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
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
