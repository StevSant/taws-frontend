import { Injectable, signal } from '@angular/core';

/**
 * Holds the current auth token in memory as a Signal. Populated by
 * `features/auth`'s AuthStore as a side effect of a successful
 * login/signup/session-restore, and cleared on logout — consumed by
 * `authInterceptor` (attaches it to outgoing API requests) and `authGuard`
 * (checks whether a route may be activated).
 */
@Injectable({ providedIn: 'root' })
export class AuthTokenService {
  private readonly token = signal<string | null>(null);

  readonly currentToken = this.token.asReadonly();

  setToken(token: string | null): void {
    this.token.set(token);
  }

  clearToken(): void {
    this.setToken(null);
  }
}
