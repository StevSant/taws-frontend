import { Injectable, signal } from '@angular/core';

/**
 * Holds the current auth token in memory as a Signal.
 * Placeholder for the hackathon skeleton — replace `setToken` calls with the
 * real Supabase Auth session wiring once auth is implemented.
 */
@Injectable({ providedIn: 'root' })
export class AuthTokenService {
  private readonly token = signal<string | null>(null);

  readonly currentToken = this.token.asReadonly();

  setToken(token: string | null): void {
    this.token.set(token);
  }
}
