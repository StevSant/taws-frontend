import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { Locale, TranslationService } from '../../core';

@Component({
  selector: 'app-language-toggle',
  standalone: true,
  templateUrl: './language-toggle.component.html',
  styleUrl: './language-toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageToggleComponent {
  readonly i18n = inject(TranslationService);
  readonly isOpen = signal(false);

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  toggle(): void {
    this.isOpen.update((open) => !open);
  }

  selectLocale(locale: Locale): void {
    this.i18n.setLocale(locale);
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) {
      return;
    }
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isOpen.set(false);
  }
}
