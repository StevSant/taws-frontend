import { Injectable, signal } from '@angular/core';
import { AppConfigService } from '../config/app-config.service';
import { LOCALE_STORAGE_KEY } from './locale-storage-key';
import { Locale } from './locale.model';
import { TranslationDict, TranslationKey } from './translation-dict.model';
import { EN_TRANSLATIONS } from './translations/en';
import { ES_TRANSLATIONS } from './translations/es';

const DEFAULT_LOCALE: Locale = 'es';

const DICTIONARIES: Record<Locale, TranslationDict> = {
  es: ES_TRANSLATIONS,
  en: EN_TRANSLATIONS,
};

/**
 * Signal-based, runtime-switchable translation lookup. No build-time locale
 * packages (no @angular/localize, no ngx-translate) — deliberately
 * lightweight for the hackathon. ES is the default locale; the choice
 * persists to localStorage so it survives reloads.
 */
@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly localeSignal = signal<Locale>(this.readStoredLocale());

  readonly locale = this.localeSignal.asReadonly();

  constructor(private readonly config: AppConfigService) {}

  /**
   * Looks up `key` in the active locale's dictionary. Falls back to the key
   * itself and logs a dev-only warning if the dictionary is missing an
   * entry (should not happen given `satisfies TranslationDict`, but this
   * keeps a broken dictionary from crashing the UI).
   */
  t(key: TranslationKey): string {
    const dictionary = DICTIONARIES[this.localeSignal()];
    const value = dictionary[key];
    if (value === undefined) {
      if (!this.config.production) {
        console.warn(`[i18n] Missing translation for "${key}" in locale "${this.localeSignal()}"`);
      }
      return key;
    }
    return value;
  }

  setLocale(locale: Locale): void {
    this.localeSignal.set(locale);
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }

  private readStoredLocale(): Locale {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return stored === 'en' || stored === 'es' ? stored : DEFAULT_LOCALE;
  }
}
