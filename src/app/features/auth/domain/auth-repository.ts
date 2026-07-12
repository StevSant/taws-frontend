import { AuthSession } from './models/auth-session.model';

/**
 * Domain port for email+password authentication. An abstract class (not an
 * interface) so it can double as an Angular DI token — bind the concrete
 * adapter via `{ provide: AuthRepository, useClass: SupabaseAuthRepository }`.
 *
 * Business/application code (AuthStore) depends on this abstraction only; it
 * never imports the Supabase SDK directly.
 */
export abstract class AuthRepository {
  /**
   * Creates a new account. Returns `null` when the Supabase project requires
   * email confirmation before a session is issued — the caller must treat
   * that as "check your inbox," not as a failure.
   */
  abstract signUp(email: string, password: string): Promise<AuthSession | null>;

  abstract signIn(email: string, password: string): Promise<AuthSession>;

  abstract signOut(): Promise<void>;

  /** Restores a persisted session on app bootstrap, or `null` if there isn't one. */
  abstract getSession(): Promise<AuthSession | null>;

  /**
   * Forces an access-token refresh using the persisted refresh token.
   * Returns the new session, or `null` when no session can be refreshed
   * (e.g. the refresh token itself is expired/revoked). Used to recover from
   * a `401` on our own API before giving up and signing the user out.
   */
  abstract refreshSession(): Promise<AuthSession | null>;

  /**
   * Subscribes to session changes (token refresh, sign-out from another tab,
   * sign-in). Returns an unsubscribe function.
   */
  abstract onSessionChange(callback: (session: AuthSession | null) => void): () => void;
}
