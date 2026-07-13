import { Locale } from '../i18n/locale.model';

/**
 * The authenticated user's stored preferences (issue #67).
 *
 * `preferredLocale` is `null` when the user has never picked a language — the UI then keeps
 * whatever locale it already has (its `es` default, or a choice made while anonymous)
 * instead of being forced onto one.
 */
export interface UserProfile {
  readonly userId: string;
  readonly preferredLocale: Locale | null;
}
