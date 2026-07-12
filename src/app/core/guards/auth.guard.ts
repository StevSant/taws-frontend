import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, firstValueFrom, timeout } from 'rxjs';
import { AuthTokenService } from '../auth/auth-token.service';
import { AuthStore } from '../../features/auth/application';

const AUTH_READY_TIMEOUT_MS = 4_000;

async function waitForAuthReady(auth: AuthStore): Promise<void> {
  if (auth.ready()) {
    return;
  }

  try {
    await firstValueFrom(
      toObservable(auth.ready).pipe(
        filter((ready) => ready),
        timeout(AUTH_READY_TIMEOUT_MS),
      ),
    );
  } catch {
    // Proceed even if Supabase restore is still in flight.
  }
}

/**
 * Redirects unauthenticated navigation to `/login`, preserving the attempted
 * URL as `?returnUrl=` so the login page can send the user back once
 * AuthStore's session-restore/login resolves.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const tokenService = inject(AuthTokenService);
  const auth = inject(AuthStore);
  const router = inject(Router);

  await waitForAuthReady(auth);

  if (tokenService.currentToken()) {
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
