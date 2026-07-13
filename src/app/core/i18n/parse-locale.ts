import { Locale } from './locale.model';

/**
 * Narrows an untrusted string to a supported `Locale`, or `null` when it isn't one.
 *
 * Both sources of a locale are outside the type system: `localStorage` (a user can put
 * anything there) and the backend's `preferred_locale` column (a BCP-47-ish `text` field
 * that accepts `es-MX` and friends). Returning `null` rather than a default lets each
 * caller decide what "unusable" means — `TranslationService` falls back to `es`, while
 * `LocalePreferenceService` leaves the current locale alone.
 */
export function parseLocale(value: string | null | undefined): Locale | null {
  return value === 'en' || value === 'es' ? value : null;
}
