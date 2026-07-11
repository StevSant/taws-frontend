import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthTokenService } from '../auth/auth-token.service';

/**
 * Placeholder route guard. Currently always allows navigation — wire real
 * redirect-to-login behavior once Supabase Auth is integrated.
 */
export const authGuard: CanActivateFn = () => {
  inject(AuthTokenService);
  return true;
};
