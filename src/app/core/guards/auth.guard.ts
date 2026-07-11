import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthTokenService } from '../auth/auth-token.service';

/**
 * Redirects unauthenticated navigation to `/login`, preserving the attempted
 * URL as `?returnUrl=` so the login page can send the user back once
 * AuthStore's session-restore/login resolves.
 *
 * Reads `AuthTokenService` (not the feature-level AuthStore) so `core/`
 * stays free of a dependency on `features/auth` — the store is what keeps
 * the token service in sync, not the other way around.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const tokenService = inject(AuthTokenService);
  const router = inject(Router);

  if (tokenService.currentToken()) {
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
