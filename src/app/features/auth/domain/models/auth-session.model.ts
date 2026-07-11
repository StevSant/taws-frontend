import { AuthUser } from './auth-user.model';

/**
 * A live Supabase Auth session. `accessToken` is the JWT handed to
 * `AuthTokenService.setToken` so the auth interceptor can attach it to
 * outgoing API requests.
 */
export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}
