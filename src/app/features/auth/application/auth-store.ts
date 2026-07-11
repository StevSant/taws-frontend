import { Injectable, computed, signal } from '@angular/core';
import { AuthTokenService } from '../../../core';
import { AuthRepository, AuthSession, AuthUser } from '../domain';

/**
 * `submitting` covers both login and signup while their promise is in
 * flight. `confirmationRequired` is a signup-only outcome: the Supabase
 * project has "Confirm email" enabled, so signUp succeeded but issued no
 * session yet — the user must click the confirmation link before logging in.
 */
export type AuthStatus = 'idle' | 'submitting' | 'confirmationRequired';

/**
 * Signal-based state + facade for the auth feature. Presentation components
 * read `user`/`isAuthenticated`/`status`/`error` and call
 * `login()`/`signUp()`/`logout()`; they never touch AuthRepository or the
 * Supabase SDK directly.
 *
 * Root-scoped (unlike ChatStore) — session state must be a single app-wide
 * source of truth, shared by the shell header, the route guard's downstream
 * effects, and every page.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly userSignal = signal<AuthUser | null>(null);
  private readonly statusSignal = signal<AuthStatus>('idle');
  private readonly errorSignal = signal<string | null>(null);
  private readonly readySignal = signal(false);

  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly status = this.statusSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  /** True once the initial session restore (app bootstrap) has completed. */
  readonly ready = this.readySignal.asReadonly();

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly authTokenService: AuthTokenService,
  ) {}

  /**
   * Restores any session persisted by the SDK (localStorage) and subscribes
   * to future session changes (token refresh, sign-out from another tab).
   * Called once from an app initializer (see app.config.ts) so the route
   * guard never sees a false "logged out" on page refresh.
   */
  async initialize(): Promise<void> {
    try {
      const session = await this.authRepository.getSession();
      this.applySession(session);
    } catch (error: unknown) {
      // Never let a failed restore (e.g. offline token refresh) reject this
      // promise — it's awaited by a blocking app initializer (app.config.ts)
      // and a rejection there would white-screen the whole app, including
      // routes that don't need auth. Fall back to "logged out" instead.
      console.error('[auth] Failed to restore session:', error);
      this.applySession(null);
    } finally {
      this.authRepository.onSessionChange((session) => this.applySession(session));
      this.readySignal.set(true);
    }
  }

  async login(email: string, password: string): Promise<void> {
    this.statusSignal.set('submitting');
    this.errorSignal.set(null);
    try {
      const session = await this.authRepository.signIn(email, password);
      this.applySession(session);
      this.statusSignal.set('idle');
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
      this.statusSignal.set('idle');
    }
  }

  async signUp(email: string, password: string): Promise<void> {
    this.statusSignal.set('submitting');
    this.errorSignal.set(null);
    try {
      const session = await this.authRepository.signUp(email, password);
      if (session === null) {
        this.statusSignal.set('confirmationRequired');
        return;
      }
      this.applySession(session);
      this.statusSignal.set('idle');
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
      this.statusSignal.set('idle');
    }
  }

  async logout(): Promise<void> {
    try {
      await this.authRepository.signOut();
    } finally {
      this.applySession(null);
    }
  }

  private applySession(session: AuthSession | null): void {
    this.userSignal.set(session?.user ?? null);
    if (session) {
      this.authTokenService.setToken(session.accessToken);
    } else {
      this.authTokenService.clearToken();
    }
  }

  private toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown authentication error';
  }
}
