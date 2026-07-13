import { Injectable, effect, inject } from '@angular/core';
import { AuthTokenService } from '../auth/auth-token.service';
import { ProfileRepository } from '../profile';
import { Locale } from './locale.model';
import { TranslationService } from './translation-service';

/**
 * Makes the language choice durable for logged-in users (issue #67).
 *
 * `TranslationService` alone only writes `localStorage`, which is per-browser — so the
 * agent, which reads the preference server-side, could never honor it on another device.
 * This service is the single entry point for *changing* the locale: it always updates the
 * UI first (instant, and the only thing an anonymous visitor gets), then mirrors the choice
 * onto the user's profile when there is a session.
 *
 * On login it seeds the UI from the stored profile, so a user who picked English on their
 * laptop lands in English on their phone. Instantiated by an app initializer in
 * `app.config.ts` — nothing injects it at bootstrap, and without that its `effect` would
 * never run.
 */
@Injectable({ providedIn: 'root' })
export class LocalePreferenceService {
  private readonly translation = inject(TranslationService);
  private readonly profileRepository = inject(ProfileRepository);
  private readonly authToken = inject(AuthTokenService);

  /**
   * Guards the seed against re-running on every token *refresh*: the profile is only read
   * back when a session first appears. Re-reading on refresh could otherwise clobber a
   * locale the user just picked, with the stale value of a `PATCH` still in flight.
   */
  private hasSession = false;

  constructor() {
    effect(() => {
      const hasSession = this.authToken.currentToken() !== null;
      const isNewSession = hasSession && !this.hasSession;
      this.hasSession = hasSession;
      if (isNewSession) {
        void this.seedFromProfile();
      }
    });
  }

  readonly locale = this.translation.locale;

  /**
   * Applies `locale` to the UI and, for a logged-in user, persists it to their profile.
   *
   * The persist is deliberately not awaited: the toggle must feel instant, and the UI is
   * already correct (and survives a reload via `localStorage`) whether or not the write
   * lands. A failure is logged, not surfaced — the worst case is that the agent answers in
   * the previously stored language on another device.
   */
  setLocale(locale: Locale): void {
    this.translation.setLocale(locale);
    if (!this.authToken.currentToken()) {
      return;
    }
    void this.profileRepository.savePreferredLocale(locale).catch((error: unknown) => {
      console.error('[i18n] Failed to persist the language preference:', error);
    });
  }

  /**
   * Adopts the stored `preferred_locale` on login. A user who never picked one has
   * `null` — the UI then keeps the locale it already has (the `es` default, or whatever
   * they chose while anonymous) rather than being flipped to an arbitrary one.
   */
  private async seedFromProfile(): Promise<void> {
    try {
      const profile = await this.profileRepository.fetchProfile();
      if (profile.preferredLocale) {
        this.translation.setLocale(profile.preferredLocale);
      }
    } catch (error: unknown) {
      console.error('[i18n] Failed to load the stored language preference:', error);
    }
  }
}
