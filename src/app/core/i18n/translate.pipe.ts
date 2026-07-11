import { Pipe, PipeTransform } from '@angular/core';
import { Locale } from './locale.model';
import { TranslationKey } from './translation-dict.model';
import { TranslationService } from './translation-service';

/**
 * Template pipe for translation lookups: `{{ 'shell.title' | translate:i18n.locale() }}`.
 *
 * Kept `pure` (Angular's default — no `pure: false`). Angular's pure-pipe
 * memoization only re-invokes `transform` when a *bound argument* changes;
 * a signal read hidden inside the method body (with no change to the bound
 * arguments) is invisible to that check and would silently stop updating on
 * locale change. Passing the active locale as an explicit second argument
 * makes the locale change part of the compared arguments, so the pipe stays
 * pure and still updates reactively. Prefer `TranslationService.t()` directly
 * in components where convenient — this pipe exists for template ergonomics.
 */
@Pipe({ name: 'translate', standalone: true })
export class TranslatePipe implements PipeTransform {
  constructor(private readonly translation: TranslationService) {}

  transform(key: TranslationKey, locale: Locale = this.translation.locale()): string {
    void locale;
    return this.translation.t(key);
  }
}
