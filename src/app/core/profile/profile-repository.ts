import { Locale } from '../i18n/locale.model';
import { UserProfile } from './user-profile.model';

/**
 * Port for the authenticated user's stored preferences (issue #67). An abstract class (not
 * an interface) so it can double as an Angular DI token — bound in `app.config.ts`.
 *
 * Always the caller's own profile: the backend derives the user from the bearer token, so
 * neither method takes a user id.
 */
export abstract class ProfileRepository {
  abstract fetchProfile(): Promise<UserProfile>;
  abstract savePreferredLocale(locale: Locale): Promise<UserProfile>;
}
