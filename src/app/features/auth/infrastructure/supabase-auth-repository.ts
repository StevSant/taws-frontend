import { Injectable } from '@angular/core';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import { AppConfigService } from '../../../core';
import { AuthRepository } from '../domain/auth-repository';
import { AuthConfigMissingError, AuthNoSessionError } from '../domain/errors';
import { AuthSession } from '../domain/models/auth-session.model';

const CONFIG_MISSING_MESSAGE =
  'Supabase is not configured — set supabaseAnonKey in src/environments/environment.ts (get it from the Supabase dashboard: Project Settings -> API -> anon/public key). Auth is disabled until then.';

/**
 * Where the confirmation email sends the user back to. Derived from the
 * running origin rather than config so a signup on localhost:4200 confirms
 * back to localhost:4200 and one on the deployed site confirms back to the
 * deployed site — without it, Supabase falls back to the project's single
 * global Site URL and every environment lands on whichever one that is.
 *
 * Every origin used here must also be listed under Authentication -> URL
 * Configuration -> Redirect URLs in the Supabase dashboard; Supabase ignores
 * an `emailRedirectTo` that isn't on that allow-list and silently uses the
 * Site URL instead.
 *
 * `/login` is the target because it already handles both outcomes: on success
 * the SDK picks the session out of the URL hash and the page's effect
 * forwards the now-authenticated user into the app; on failure (expired or
 * already-used link) the user is left on a page where they can just sign in.
 */
const EMAIL_CONFIRM_REDIRECT_PATH = '/login';

/**
 * Infrastructure adapter for AuthRepository, backed by the Supabase JS SDK.
 *
 * The SDK owns session persistence (localStorage) and access-token refresh
 * — this adapter only translates between the SDK's `Session` shape and our
 * domain `AuthSession`, and exposes `onSessionChange` so AuthStore can keep
 * `AuthTokenService` in sync whenever the SDK refreshes or drops the token.
 *
 * `createClient` throws synchronously if the key is missing — and this
 * repository is constructed inside a blocking app initializer (see
 * app.config.ts), so an eager throw here would white-screen the *entire*
 * app, including public routes that don't need auth at all. Degrade
 * gracefully instead: without a client, session methods resolve to "logged
 * out" and login/signup surface `CONFIG_MISSING_MESSAGE` as a normal
 * AuthStore error rather than a crash.
 *
 * Bound to AuthRepository in app.config.ts.
 */
@Injectable()
export class SupabaseAuthRepository extends AuthRepository {
  private readonly client: SupabaseClient | null;

  constructor(config: AppConfigService) {
    super();
    this.client = this.tryCreateClient(config);
  }

  async signUp(email: string, password: string): Promise<AuthSession | null> {
    const { data, error } = await this.requireClient().auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${EMAIL_CONFIRM_REDIRECT_PATH}`,
      },
    });
    if (error) {
      throw new Error(error.message);
    }
    return this.toAuthSession(data.session);
  }

  async signIn(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await this.requireClient().auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw new Error(error.message);
    }

    const session = this.toAuthSession(data.session);
    if (!session) {
      throw new AuthNoSessionError('Supabase did not return a session for this login.');
    }
    return session;
  }

  async signOut(): Promise<void> {
    if (!this.client) {
      return;
    }
    const { error } = await this.client.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  async getSession(): Promise<AuthSession | null> {
    if (!this.client) {
      return null;
    }
    const { data, error } = await this.client.auth.getSession();
    if (error) {
      throw new Error(error.message);
    }
    return this.toAuthSession(data.session);
  }

  async refreshSession(): Promise<AuthSession | null> {
    if (!this.client) {
      return null;
    }
    const { data, error } = await this.client.auth.refreshSession();
    if (error) {
      throw new Error(error.message);
    }
    return this.toAuthSession(data.session);
  }

  onSessionChange(callback: (session: AuthSession | null) => void): () => void {
    if (!this.client) {
      return () => {};
    }
    const {
      data: { subscription },
    } = this.client.auth.onAuthStateChange((_event, session) => {
      callback(this.toAuthSession(session));
    });
    return () => subscription.unsubscribe();
  }

  private tryCreateClient(config: AppConfigService): SupabaseClient | null {
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      console.error(`[auth] ${CONFIG_MISSING_MESSAGE}`);
      return null;
    }
    return createClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  private requireClient(): SupabaseClient {
    if (!this.client) {
      throw new AuthConfigMissingError(CONFIG_MISSING_MESSAGE);
    }
    return this.client;
  }

  private toAuthSession(session: Session | null): AuthSession | null {
    if (!session) {
      return null;
    }
    return {
      accessToken: session.access_token,
      user: { id: session.user.id, email: session.user.email ?? null },
    };
  }
}
