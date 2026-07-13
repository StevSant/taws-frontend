import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { Locale, LocalePreferenceService, TranslationService } from '../../core';
import { DropdownAnchor, syncDropdownAnchor } from '../sync-dropdown-anchor';

@Component({
  selector: 'app-language-toggle',
  standalone: true,
  templateUrl: './language-toggle.component.html',
  styleUrl: './language-toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.pref-control-host--open]': 'isOpen()',
  },
})
export class LanguageToggleComponent {
  readonly i18n = inject(TranslationService);
  private readonly localePreference = inject(LocalePreferenceService);
  readonly isOpen = signal(false);
  readonly menuAnchor = signal<DropdownAnchor>({ top: 0, left: 0 });

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  toggle(): void {
    const opening = !this.isOpen();
    if (opening) {
      this.syncMenuAnchor();
    }
    this.isOpen.set(opening);
  }

  /**
   * Goes through `LocalePreferenceService`, not `TranslationService`, so a logged-in user's
   * choice is persisted to their profile and not just to this browser's localStorage — that
   * is what lets the agent answer in this language on their other devices (issue #67).
   */
  selectLocale(locale: Locale): void {
    this.localePreference.setLocale(locale);
    this.isOpen.set(false);
  }

  currentLabel(): string {
    return this.i18n.locale() === 'es'
      ? this.i18n.t('shell.language.es')
      : this.i18n.t('shell.language.en');
  }

  alternateLocale(): Locale {
    return this.i18n.locale() === 'es' ? 'en' : 'es';
  }

  alternateLabel(): string {
    return this.alternateLocale() === 'es'
      ? this.i18n.t('shell.language.es')
      : this.i18n.t('shell.language.en');
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onViewportChange(): void {
    if (this.isOpen()) {
      this.syncMenuAnchor();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) {
      return;
    }
    const target = event.target as Node;
    if (!this.host.nativeElement.contains(target)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isOpen.set(false);
  }

  private syncMenuAnchor(): void {
    this.menuAnchor.set(syncDropdownAnchor(this.host.nativeElement));
  }
}
